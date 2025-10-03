import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendMessagesWithTyping,
    sendQuickReplyNoTyping,
    sendQuickReply,
    createQuickReply,
    hideButtons
} from '../facebook-api'
import { isTrialUser, isExpiredUser, daysUntilExpiry, getFacebookDisplayName, updateBotSession, getBotSession } from '../utils'
import { sessionManager, SessionManager } from './session-manager'

// Import flow handlers
import {
    AuthFlow,
    MarketplaceFlow,
    CommunityFlow,
    PaymentFlow,
    UtilityFlow,
    AdminFlow
} from '../flows'

// Import anti-spam and admin chat
import * as AdminHandlers from '../handlers/admin-handlers'
import * as AdminExtra from '../handlers/admin-extra'
import { isUserInAdminChat, handleUserMessageInAdminChat, startAdminChatSession, endAdminChatSession } from '../admin-chat'

export interface MessageContext {
    user: any
    text: string
    isPostback?: boolean
    postback?: string
    session?: any
}

export class MessageRouter {
    private authFlow: AuthFlow
    private marketplaceFlow: MarketplaceFlow
    private communityFlow: CommunityFlow
    private paymentFlow: PaymentFlow
    private utilityFlow: UtilityFlow
    private adminFlow: AdminFlow
    private sessionManager: SessionManager

    constructor() {
        this.authFlow = new AuthFlow()
        this.marketplaceFlow = new MarketplaceFlow()
        this.communityFlow = new CommunityFlow()
        this.paymentFlow = new PaymentFlow()
        this.utilityFlow = new UtilityFlow()
        this.adminFlow = new AdminFlow()
        this.sessionManager = sessionManager
    }

    /**
     * Main message routing logic
     */
    async routeMessage(context: MessageContext): Promise<void> {
        const { user, text, isPostback = false, postback = '', session } = context

        try {
            // Check if user exists and has required properties
            if (!user || !user.facebook_id) {
                console.error('Invalid user in message routing:', user)
                return
            }

            // Check if user is admin first - skip all restrictions for admin
            const userIsAdmin = await this.checkAdminStatus(user.facebook_id)

            // Handle admin chat session if active
            if (userIsAdmin) {
                const adminSession = await this.getActiveAdminSession(user.facebook_id)
                if (adminSession && adminSession.id) {
                    await this.handleAdminChatMessage(user.facebook_id, adminSession.id, text)
                    return
                }
            }

            // Handle anti-spam for non-admin users
            if (!userIsAdmin) {
                const spamCheck = await this.checkSpamStatus(user.facebook_id, text, isPostback)
                if (spamCheck.shouldStop) {
                    await this.sendBotStoppedMessage(user.facebook_id, spamCheck.reason)
                    return
                }
            }

            // Check if user is in admin chat mode (PRIORITY: Admin chat takes precedence)
            if (await isUserInAdminChat(user.facebook_id)) {
                console.log('User is in admin chat mode, forwarding message to admin')
                await handleUserMessageInAdminChat(user.facebook_id, text)
                return
            }

            // Check if user is in an active flow
            const sessionData = await this.sessionManager.getSession(user.facebook_id)
            const currentFlow = sessionData?.current_flow || null

            if (currentFlow) {
                // Handle flow cancellation
                if (this.isCancelCommand(text)) {
                    await this.handleFlowCancellation(user, currentFlow)
                    return
                }

                // Route to appropriate flow
                await this.routeToFlow(user, text, currentFlow, session)
                return
            }

            // Handle trial/expiration status for non-admin users
            if (!userIsAdmin) {
                const statusCheck = await this.checkUserStatus(user)
                if (statusCheck.shouldExit && statusCheck.sendMessage) {
                    await statusCheck.sendMessage(user.facebook_id)
                    return
                }
            }

            // Route to appropriate handler based on message content
            if (isPostback) {
                await this.routePostback(user, postback)
            } else {
                await this.routeTextMessage(user, text)
            }

        } catch (error) {
            console.error('Error in message routing:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Check if user is admin
     */
    private async checkAdminStatus(facebookId: string): Promise<boolean> {
        const { isAdmin } = await import('../handlers/admin-handlers')
        return await isAdmin(facebookId)
    }

    /**
     * Get active admin session
     */
    private async getActiveAdminSession(adminId: string): Promise<any> {
        const { data: adminSession } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('*')
            .eq('admin_id', adminId)
            .eq('status', 'active')
            .single()

        return adminSession
    }

    /**
     * Handle admin chat message
     */
    private async handleAdminChatMessage(adminId: string, sessionId: string, text: string): Promise<void> {
        const { handleAdminMessageToUser } = await import('../admin-chat')
        await handleAdminMessageToUser(adminId, sessionId, text)
    }

    /**
     * Check spam status for non-admin users
     */
    private async checkSpamStatus(facebookId: string, text: string, isPostback: boolean): Promise<{ shouldStop: boolean, reason?: string }> {
        const { isBotStoppedForUser, trackNonButtonMessage, sendBotStoppedMessage, sendNonButtonWarning } = await import('../anti-spam')

        if (await isBotStoppedForUser(facebookId)) {
            return { shouldStop: true, reason: 'Bot temporarily stopped for spam prevention' }
        }

        if (!isPostback) {
            const nonButtonResult = await trackNonButtonMessage(facebookId, text)
            if (nonButtonResult.shouldStopBot) {
                return { shouldStop: true, reason: nonButtonResult.reason }
            }
        }

        return { shouldStop: false }
    }

    /**
     * Send bot stopped message
     */
    private async sendBotStoppedMessage(facebookId: string, reason?: string): Promise<void> {
        const { sendBotStoppedMessage } = await import('../anti-spam')
        await sendBotStoppedMessage(facebookId, reason || 'Bot temporarily stopped for spam prevention')
    }

    /**
     * Check if command is a cancellation command
     */
    private isCancelCommand(text: string): boolean {
        const cancelKeywords = ['hủy', 'thoát', 'cancel', 'quit']
        return cancelKeywords.some(keyword => text.toLowerCase().includes(keyword))
    }

    /**
     * Handle flow cancellation
     */
    private async handleFlowCancellation(user: any, currentFlow: string): Promise<void> {
        const flowName = this.getFlowDisplayName(currentFlow)
        await sendMessage(user.facebook_id, `❌ Đã hủy quy trình ${flowName} hiện tại.`)
        await updateBotSession(user.facebook_id, null)
        await sendMessage(user.facebook_id, 'Bạn có thể bắt đầu quy trình mới.')
    }

    /**
     * Get flow display name for user messages
     */
    private getFlowDisplayName(flow: string): string {
        const flowNames: { [key: string]: string } = {
            'registration': 'đăng ký',
            'listing': 'niêm yết',
            'search': 'tìm kiếm'
        }
        return flowNames[flow] || flow
    }

    /**
     * Route to appropriate flow
     */
    private async routeToFlow(user: any, text: string, currentFlow: string, session: any): Promise<void> {
        switch (currentFlow) {
            case 'registration':
                await this.authFlow.handleStep(user, text, session.session_data)
                break
            case 'listing':
                await this.marketplaceFlow.handleStep(user, text, session.session_data)
                break
            case 'search':
                await this.marketplaceFlow.handleSearchStep(user, text, session.session_data)
                break
            default:
                console.warn('Unknown flow:', currentFlow)
                await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Check user status (trial/expired)
     */
    private async checkUserStatus(user: any): Promise<{ shouldExit: boolean, sendMessage?: (facebookId: string) => Promise<void> }> {
        if (isExpiredUser(user.membership_expires_at)) {
            return {
                shouldExit: true,
                sendMessage: async (facebookId: string) => {
                    const { sendExpiredMessage } = await import('../handlers/payment-handlers')
                    await sendExpiredMessage(facebookId)
                }
            }
        }

        if (isTrialUser(user.membership_expires_at)) {
            const daysLeft = daysUntilExpiry(user.membership_expires_at!)
            if (daysLeft <= 2) {
                return {
                    shouldExit: true,
                    sendMessage: async (facebookId: string) => {
                        const { sendTrialExpiringMessage } = await import('../handlers/payment-handlers')
                        await sendTrialExpiringMessage(facebookId, daysLeft)
                    }
                }
            }
        }

        return { shouldExit: false }
    }

    /**
     * Route postback messages
     */
    private async routePostback(user: any, postback: string): Promise<void> {
        // Reset non-button tracking when user clicks a button
        const { resetNonButtonTracking } = await import('../anti-spam')
        resetNonButtonTracking(user.facebook_id)

        // Check if user is in active flow (for non-admin users)
        const userIsAdmin = await this.checkAdminStatus(user.facebook_id)
        if (!userIsAdmin) {
            const session = await getBotSession(user.facebook_id)
            const sessionData = await this.sessionManager.getSession(user.facebook_id)
            const currentFlow = sessionData?.current_flow || null

            if (currentFlow && !this.isFlowAllowedAction(postback, currentFlow)) {
                await this.sendFlowRestrictionMessage(user.facebook_id, currentFlow)
                return
            }
        }

        // Parse postback action
        const [action, ...params] = postback.split('_')

        // Route to appropriate handler
        switch (action) {
            // Auth handlers
            case 'REGISTER':
                await this.authFlow.handleRegistration(user)
                break
            case 'REG':
                if (params[0] === 'LOCATION') {
                    await this.authFlow.handleRegistrationLocationPostback(user, params[1])
                } else if (params[0] === 'BIRTHDAY') {
                    if (params[1] === 'YES') {
                        await this.authFlow.handleBirthdayVerification(user)
                    } else {
                        await this.authFlow.handleBirthdayRejection(user)
                    }
                }
                break
            case 'INFO':
                await this.authFlow.handleInfo(user)
                break
            case 'CONTACT':
                if (params[0] === 'ADMIN') {
                    await this.handleContactAdmin(user)
                }
                break

            // Admin handlers
            case 'ADMIN':
                await this.adminFlow.handleCommand(user)
                break

            // Marketplace handlers
            case 'LISTING':
                await this.marketplaceFlow.handleListing(user)
                break
            case 'SEARCH':
                await this.marketplaceFlow.handleSearch(user)
                break
            case 'VIEW':
                if (params[0] === 'LISTING') {
                    await this.marketplaceFlow.handleViewListing(user, params[1])
                }
                break
            case 'CONTACT':
                if (params[0] === 'SELLER') {
                    await this.marketplaceFlow.handleContactSeller(user, params[1])
                }
                break
            case 'MY':
                if (params[0] === 'LISTINGS') {
                    await this.marketplaceFlow.handleMyListings(user)
                }
                break

            // Community handlers
            case 'COMMUNITY':
                await this.communityFlow.handleCommunity(user)
                break
            case 'EVENT':
                if (params[0] === 'REGISTER') {
                    await this.communityFlow.handleEventRegistration(user, params[1])
                }
                break

            // Payment handlers
            case 'PAYMENT':
                await this.paymentFlow.handlePayment(user)
                break

            // Utility handlers
            case 'HOROSCOPE':
                await this.utilityFlow.handleHoroscope(user)
                break
            case 'POINTS':
                await this.utilityFlow.handlePoints(user)
                break
            case 'SETTINGS':
                await this.utilityFlow.handleSettings(user)
                break
            case 'SUPPORT':
                await this.utilityFlow.handleSupport(user)
                break

            // Main menu and utility actions
            case 'MAIN':
                if (params[0] === 'MENU') {
                    await this.showMainMenu(user)
                }
                break
            case 'EXIT':
                if (params[0] === 'BOT') {
                    await this.handleExitBot(user)
                }
                break

            default:
                await this.handleDefaultMessage(user)
        }
    }

    /**
     * Route text messages
     */
    private async routeTextMessage(user: any, text: string): Promise<void> {
        const userIsAdmin = await this.checkAdminStatus(user.facebook_id)

        // Handle text-based commands
        if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
            await this.authFlow.handleRegistration(user)
        } else if (text.includes('niêm yết') || text.includes('NIÊM YẾT')) {
            await this.marketplaceFlow.handleListing(user)
        } else if (text.includes('tìm kiếm') || text.includes('TÌM KIẾM')) {
            await this.marketplaceFlow.handleSearch(user)
        } else if (text.includes('cộng đồng') || text.includes('CỘNG ĐỒNG')) {
            await this.communityFlow.handleCommunity(user)
        } else if (text.includes('thanh toán') || text.includes('THANH TOÁN')) {
            await this.paymentFlow.handlePayment(user)
        } else if (text.includes('tử vi') || text.includes('TỬ VI')) {
            await this.utilityFlow.handleHoroscope(user)
        } else if (text.includes('điểm thưởng') || text.includes('ĐIỂM THƯỞNG')) {
            await this.utilityFlow.handlePoints(user)
        } else if (text.includes('cài đặt') || text.includes('CÀI ĐẶT')) {
            await this.utilityFlow.handleSettings(user)
        } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
            await this.utilityFlow.handleSupport(user)
        } else if (text === '/admin') {
            await this.adminFlow.handleCommand(user)
        } else {
            // Handle default messages based on user status
            if (userIsAdmin) {
                await this.adminFlow.handleCommand(user)
            } else if ((user.status === 'registered' || user.status === 'trial') &&
                user.name !== 'User' && !user.phone?.startsWith('temp_')) {
                await this.utilityFlow.handleDefaultMessageRegistered(user)
            } else {
                await this.authFlow.handleDefaultMessage(user)
            }
        }
    }

    /**
     * Check if action is allowed in current flow
     */
    private isFlowAllowedAction(postback: string, currentFlow: string): boolean {
        const [action, ...params] = postback.split('_')

        // Allow quit commands
        if (action === 'MAIN' && params[0] === 'MENU') {
            return true
        }

        // Allow flow-specific actions
        switch (currentFlow) {
            case 'registration':
                return action === 'REG' || action === 'REGISTER'
            case 'listing':
                return action === 'LISTING' || action.startsWith('LISTING_')
            case 'search':
                return action === 'SEARCH' || action.startsWith('SEARCH_')
            default:
                return false
        }
    }

    /**
     * Send flow restriction message
     */
    private async sendFlowRestrictionMessage(facebookId: string, currentFlow: string): Promise<void> {
        const flowName = this.getFlowDisplayName(currentFlow)
        await sendMessage(facebookId, `❌ Bạn đang ở giữa quy trình ${flowName}.`)
        await sendMessage(facebookId, 'Vui lòng hoàn thành hoặc hủy quy trình hiện tại trước khi thực hiện hành động khác.')
        await sendMessage(facebookId, '💡 Gửi "hủy" để thoát khỏi quy trình hiện tại.')
    }

    /**
     * Show main menu
     */
    private async showMainMenu(user: any): Promise<void> {
        sendTypingIndicator(user.facebook_id).catch(err => console.error('Typing indicator error:', err))

        await hideButtons(user.facebook_id)

        const statusText = isTrialUser(user.membership_expires_at)
            ? `📅 Trial còn ${daysUntilExpiry(user.membership_expires_at!)} ngày`
            : '✅ Đã thanh toán'

        const displayName = await getFacebookDisplayName(user.facebook_id) || user.name || 'bạn'

        await sendMessage(user.facebook_id, '🏠 TRANG CHỦ Tân Dậu - Hỗ Trợ Chéo')
        await sendMessage(user.facebook_id, `👋 Chào mừng ${displayName}!`)
        await sendMessage(user.facebook_id, `📊 Trạng thái: ${statusText}`)
        await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
        await sendMessage(user.facebook_id, '🎯 Chọn chức năng bạn muốn sử dụng:')

        await sendQuickReply(
            user.facebook_id,
            '🛒 MUA BÁN & KINH DOANH:',
            [
                createQuickReply('🛒 NIÊM YẾT SẢN PHẨM', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('💬 KẾT NỐI BÁN HÀNG', 'CONTACT_SELLER'),
                createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                createQuickReply('🎁 GIỚI THIỆU BẠN BÈ', 'REFERRAL'),
                createQuickReply('⭐ ĐIỂM THƯỞNG', 'POINTS'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                createQuickReply('📊 THỐNG KÊ CÁ NHÂN', 'PERSONAL_STATS'),
                createQuickReply('⚙️ CÀI ĐẶT', 'SETTINGS'),
                createQuickReply('🔮 TỬ VI HÀNG NGÀY', 'HOROSCOPE'),
                createQuickReply('❓ HỖ TRỢ', 'SUPPORT'),
                createQuickReply('📱 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
            ]
        )
    }

    /**
     * Handle contact admin
     */
    private async handleContactAdmin(user: any): Promise<void> {
        try {
            const result = await startAdminChatSession(user.facebook_id)

            if (result.success) {
                // Typing indicator removed for quick reply
                await sendQuickReplyNoTyping(
                    user.facebook_id,
                    'Tùy chọn:',
                    [
                        createQuickReply('❌ HỦY CHAT', 'CANCEL_ADMIN_CHAT'),
                        createQuickReply('🔄 QUAY LẠI BOT', 'EXIT_ADMIN_CHAT'),
                        createQuickReply('📝 HƯỚNG DẪN', 'ADMIN_HELP_GENERAL')
                    ]
                )
            } else {
                await sendMessage(user.facebook_id, '❌ Không thể tạo yêu cầu chat. Vui lòng thử lại sau!')
            }
        } catch (error) {
            console.error('Error in handleContactAdmin:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        }
    }

    /**
     * Handle exit bot
     */
    private async handleExitBot(user: any): Promise<void> {
        // Typing indicator removed for quick reply
        await sendQuickReplyNoTyping(
            user.facebook_id,
            'Bạn có muốn:',
            [
                createQuickReply('🏠 VÀO LẠI', 'MAIN_MENU'),
                createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                createQuickReply('ℹ️ TÌM HIỂU', 'INFO')
            ]
        )
    }

    /**
     * Handle default message
     */
    private async handleDefaultMessage(user: any): Promise<void> {
        await sendTypingIndicator(user.facebook_id)
        await hideButtons(user.facebook_id)

        await sendMessage(user.facebook_id, '👋 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!')

        await sendQuickReply(
            user.facebook_id,
            'Bạn muốn:',
            [
                createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                createQuickReply('ℹ️ TÌM HIỂU', 'INFO'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
            ]
        )
    }

    /**
     * Send error message
     */
    private async sendErrorMessage(facebookId: string): Promise<void> {
        await sendMessage(facebookId, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Export singleton instance
export const messageRouter = new MessageRouter()
