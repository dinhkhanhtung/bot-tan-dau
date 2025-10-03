import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { updateBotSession } from '../utils'

// Unified Entry Point - Điểm vào duy nhất cho toàn bộ hệ thống
export class UnifiedEntryPoint {

    /**
     * Xử lý tin nhắn đầu tiên hoặc tin nhắn thường
     * Đây là điểm vào duy nhất cho toàn bộ hệ thống
     */
    static async handleInitialMessage(user: any, text?: string): Promise<void> {
        try {
            // Bước 1: Phân tích ngữ cảnh thông minh
            const context = await SmartContextManager.analyzeUserContext(user)

            // Bước 2: Lấy welcome message phù hợp
            const welcomeMessage = SmartContextManager.getContextualWelcomeMessage(context)

            // Bước 3: Lấy menu phù hợp với ngữ cảnh
            const menuOptions = SmartContextManager.getContextualMenu(context)

            // Bước 4: Gửi welcome message
            await sendTypingIndicator(user.facebook_id)
            await sendMessage(user.facebook_id, welcomeMessage)

            // Bước 5: Gửi menu phù hợp
            if (menuOptions.length > 0) {
                // Sắp xếp menu theo priority
                const sortedMenu = menuOptions.sort((a, b) => (a.priority || 999) - (b.priority || 999))

                // Tạo quick replies từ menu
                const quickReplies = sortedMenu.map(option => createQuickReply(option.title, option.action))

                // Gửi menu dưới dạng quick reply (tối đa 13 options)
                if (quickReplies.length <= 13) {
                    await sendQuickReply(user.facebook_id, 'Chọn chức năng:', quickReplies)
                } else {
                    // Nếu quá nhiều options, chia thành 2 nhóm
                    const firstGroup = quickReplies.slice(0, 11)
                    const secondGroup = quickReplies.slice(11)

                    await sendQuickReply(user.facebook_id, 'Chọn chức năng (1/2):', firstGroup)
                    await sendQuickReply(user.facebook_id, 'Chọn chức năng (2/2):', secondGroup)
                }
            }

            // Bước 6: Log ngữ cảnh để debug
            console.log('Smart Context Analysis:', {
                facebook_id: user.facebook_id,
                userType: context.userType,
                userState: context.userState,
                isInFlow: context.isInFlow,
                flowType: context.flowType
            })

        } catch (error) {
            console.error('Error in unified entry point:', error)

            // Fallback: gửi welcome message cơ bản
            await sendTypingIndicator(user.facebook_id)
            await sendMessage(user.facebook_id, '👋 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!')

            await sendQuickReply(
                user.facebook_id,
                'Bạn muốn:',
                [
                    createQuickReply('🚀 ĐĂNG KÝ', 'REGISTER'),
                    createQuickReply('ℹ️ THÔNG TIN', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
                ]
            )
        }
    }

    /**
     * Xử lý khi user chọn từ menu
     */
    static async handleMenuSelection(user: any, action: string): Promise<boolean> {
        try {
            const context = await SmartContextManager.analyzeUserContext(user)

            // Route đến handler phù hợp dựa trên action và context
            return await this.routeToHandler(user, action, context)

        } catch (error) {
            console.error('Error handling menu selection:', error)
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại!')
            return false
        }
    }

    /**
     * Route to appropriate handler based on action and context
     */
    private static async routeToHandler(user: any, action: string, context: UserContext): Promise<boolean> {
        const { userType, userState } = context

        // Handle flow-specific actions first
        if (this.isFlowAction(action)) {
            return await this.handleFlowAction(user, action, context)
        }

        // Handle admin actions
        if (userType === UserType.ADMIN && this.isAdminAction(action)) {
            return await this.handleAdminAction(user, action)
        }

        // Handle user actions based on user type
        switch (userType) {
            case UserType.ADMIN:
                return await this.handleAdminAction(user, action)

            case UserType.REGISTERED_USER:
            case UserType.TRIAL_USER:
                return await this.handleRegisteredUserAction(user, action, context)

            case UserType.EXPIRED_USER:
                return await this.handleExpiredUserAction(user, action)

            case UserType.NEW_USER:
            default:
                return await this.handleNewUserAction(user, action)
        }
    }

    /**
     * Kiểm tra xem action có phải là flow action không
     */
    private static isFlowAction(action: string): boolean {
        const flowActions = [
            'CONTINUE_REGISTRATION', 'CANCEL_REGISTRATION',
            'CONTINUE_LISTING', 'CANCEL_LISTING',
            'CONTINUE_SEARCH', 'CANCEL_SEARCH',
            'CONTINUE_PAYMENT', 'CANCEL_PAYMENT'
        ]
        return flowActions.includes(action)
    }

    /**
     * Kiểm tra xem action có phải là admin action không
     */
    private static isAdminAction(action: string): boolean {
        return action.startsWith('ADMIN_')
    }

    /**
     * Xử lý flow actions
     */
    private static async handleFlowAction(user: any, action: string, context: UserContext): Promise<boolean> {
        const { userState, flowType } = context

        switch (action) {
            case 'CONTINUE_REGISTRATION':
                if (userState === UserState.IN_REGISTRATION) {
                    // Tiếp tục registration flow
                    const { AuthFlow } = await import('../flows/auth-flow')
                    const authFlow = new AuthFlow()
                    await authFlow.handleRegistration(user)
                    return true
                }
                break

            case 'CANCEL_REGISTRATION':
                if (userState === UserState.IN_REGISTRATION) {
                    await updateBotSession(user.facebook_id, null)
                    await sendMessage(user.facebook_id, '❌ Đã hủy đăng ký. Bạn có thể bắt đầu lại bất cứ lúc nào!')
                    await this.handleInitialMessage(user)
                    return true
                }
                break

            case 'CONTINUE_LISTING':
                if (userState === UserState.IN_LISTING) {
                    // Tiếp tục listing flow - sử dụng handler từ marketplace-handlers
                    const { handleListing } = await import('../handlers/marketplace-handlers')
                    await handleListing(user)
                    return true
                }
                break

            case 'CANCEL_LISTING':
                if (userState === UserState.IN_LISTING) {
                    await updateBotSession(user.facebook_id, null)
                    await sendMessage(user.facebook_id, '❌ Đã hủy niêm yết. Bạn có thể tạo tin mới bất cứ lúc nào!')
                    await this.handleInitialMessage(user)
                    return true
                }
                break

            case 'CONTINUE_SEARCH':
                if (userState === UserState.IN_SEARCH) {
                    // Tiếp tục search flow - sử dụng handler từ marketplace-handlers
                    const { handleSearch } = await import('../handlers/marketplace-handlers')
                    await handleSearch(user)
                    return true
                }
                break

            case 'CANCEL_SEARCH':
                if (userState === UserState.IN_SEARCH) {
                    await updateBotSession(user.facebook_id, null)
                    await sendMessage(user.facebook_id, '❌ Đã hủy tìm kiếm. Bạn có thể tìm kiếm lại bất cứ lúc nào!')
                    await this.handleInitialMessage(user)
                    return true
                }
                break
        }

        return false
    }

    /**
     * Xử lý admin actions
     */
    private static async handleAdminAction(user: any, action: string): Promise<boolean> {
        try {
            const { handleAdminCommand, handleAdminPayments, handleAdminUsers } = await import('../handlers/admin-handlers')

            switch (action) {
                case 'ADMIN_PAYMENTS':
                    await handleAdminPayments(user)
                    return true
                case 'ADMIN_USERS':
                    await handleAdminUsers(user)
                    return true
                case 'ADMIN_LISTINGS':
                    const { handleAdminListings } = await import('../handlers/admin-handlers')
                    await handleAdminListings(user)
                    return true
                case 'ADMIN_STATS':
                    const { handleAdminStats } = await import('../handlers/admin-handlers')
                    await handleAdminStats(user)
                    return true
                case 'ADMIN_NOTIFICATIONS':
                    const { handleAdminNotifications } = await import('../handlers/admin-handlers')
                    await handleAdminNotifications(user)
                    return true
                case 'ADMIN_SETTINGS':
                    const { handleAdminSettings } = await import('../handlers/admin-handlers')
                    await handleAdminSettings(user)
                    return true
                default:
                    await handleAdminCommand(user)
                    return true
            }
        } catch (error) {
            console.error('Error handling admin action:', error)
            return false
        }
    }

    /**
     * Xử lý registered user actions
     */
    private static async handleRegisteredUserAction(user: any, action: string, context: UserContext): Promise<boolean> {
        try {
            switch (action) {
                case 'MAIN_MENU':
                    await this.showMainMenu(user, context)
                    return true

                case 'LISTING':
                    const { handleListing } = await import('../handlers/marketplace-handlers')
                    await handleListing(user)
                    return true

                case 'SEARCH':
                    const { handleSearch } = await import('../handlers/marketplace-handlers')
                    await handleSearch(user)
                    return true

                case 'COMMUNITY':
                    const { handleCommunity } = await import('../handlers/community-handlers')
                    await handleCommunity(user)
                    return true

                case 'PAYMENT':
                case 'PAYMENT_URGENT':
                    const { handlePayment } = await import('../handlers/payment-handlers')
                    await handlePayment(user)
                    return true

                case 'POINTS':
                    const { handlePoints } = await import('../handlers/utility-handlers')
                    await handlePoints(user)
                    return true

                case 'SETTINGS':
                    const { handleSettings } = await import('../handlers/utility-handlers')
                    await handleSettings(user)
                    return true

                default:
                    await this.showMainMenu(user, context)
                    return true
            }
        } catch (error) {
            console.error('Error handling registered user action:', error)
            return false
        }
    }

    /**
     * Xử lý expired user actions
     */
    private static async handleExpiredUserAction(user: any, action: string): Promise<boolean> {
        try {
            switch (action) {
                case 'PAYMENT':
                    const { handlePayment } = await import('../handlers/payment-handlers')
                    await handlePayment(user)
                    return true

                case 'REGISTER':
                    const { AuthFlow } = await import('../flows/auth-flow')
                    const authFlow = new AuthFlow()
                    await authFlow.handleRegistration(user)
                    return true

                case 'INFO':
                    await sendMessage(user.facebook_id, 'ℹ️ Để tiếp tục sử dụng bot, vui lòng thanh toán để gia hạn tài khoản.')
                    await this.handleInitialMessage(user)
                    return true

                default:
                    await this.handleInitialMessage(user)
                    return true
            }
        } catch (error) {
            console.error('Error handling expired user action:', error)
            return false
        }
    }

    /**
     * Xử lý new user actions
     */
    private static async handleNewUserAction(user: any, action: string): Promise<boolean> {
        try {
            switch (action) {
                case 'REGISTER':
                    // Sử dụng AuthFlow instance trực tiếp
                    const { AuthFlow } = await import('../flows/auth-flow')
                    const authFlowInstance = new AuthFlow()
                    await authFlowInstance.handleRegistration(user)
                    return true

                case 'INFO':
                    await sendMessage(user.facebook_id, 'ℹ️ Bot Tân Dậu - Hỗ Trợ Chéo dành riêng cho cộng đồng những người con Tân Dậu (sinh năm 1981).')
                    await sendMessage(user.facebook_id, '💡 Để sử dụng đầy đủ tính năng, bạn cần đăng ký thành viên.')
                    await this.handleInitialMessage(user)
                    return true

                case 'SUPPORT':
                    await sendMessage(user.facebook_id, '💬 Để được hỗ trợ, vui lòng liên hệ admin hoặc đăng ký thành viên để sử dụng đầy đủ tính năng.')
                    await this.handleInitialMessage(user)
                    return true

                default:
                    await this.handleInitialMessage(user)
                    return true
            }
        } catch (error) {
            console.error('Error handling new user action:', error)
            return false
        }
    }

    /**
     * Hiển thị main menu cho registered user
     */
    private static async showMainMenu(user: any, context: UserContext): Promise<void> {
        await sendTypingIndicator(user.facebook_id)

        const displayName = context.user?.name || 'bạn'
        const statusText = context.userType === UserType.TRIAL_USER ?
            `📅 Trial còn ${Math.ceil((new Date(context.user.membership_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} ngày` :
            '✅ Đã thanh toán'

        await sendMessage(user.facebook_id, '🏠 TRANG CHỦ Tân Dậu - Hỗ Trợ Chéo')
        await sendMessage(user.facebook_id, `👋 Chào mừng ${displayName}!`)
        await sendMessage(user.facebook_id, `📊 Trạng thái: ${statusText}`)
        await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
        await sendMessage(user.facebook_id, '🎯 Chọn chức năng bạn muốn sử dụng:')

        const mainMenuOptions = [
            createQuickReply('🛒 NIÊM YẾT SẢN PHẨM', 'LISTING'),
            createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
            createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
            createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
            createQuickReply('⭐ ĐIỂM THƯỞNG', 'POINTS'),
            createQuickReply('⚙️ CÀI ĐẶT', 'SETTINGS')
        ]

        await sendQuickReply(user.facebook_id, 'Chức năng chính:', mainMenuOptions)
    }
}
