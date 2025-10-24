/**
 * Unified User State Manager
 * Consolidated service combining logic from user-state-manager.ts, user-mode-service.ts, and smart-context-manager.ts
 * Manages user state, type, context, permissions, and interactions
 */

import { supabaseAdmin } from '../supabase'
import { sendMessage, sendQuickReply, createQuickReply, hideButtons } from '../facebook-api'
import { logger } from '../logger'
import { welcomeService, WelcomeType } from '../welcome-service'
import { getUserByFacebookId } from '../user-service'
import { getBotSession } from '../utils'
import { SessionManager } from './session-manager'
import { AntiSpamService } from '../anti-spam-service'
import { AdminTakeoverService } from '../admin-takeover-service'
import {
    UserState,
    UserType,
    UserStateData,
    UserPermissions,
    USER_PERMISSIONS
} from '../../types'

export class UnifiedUserStateManager {
    /**
     * Get current user state data
     */
    static async getUserState(facebookId: string): Promise<UserStateData | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('*')
                .eq('facebook_id', facebookId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user state', { facebookId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting user state', { facebookId, error })
            return null
        }
    }

    /**
     * Update user state
     */
    static async updateUserState(facebookId: string, state: UserState): Promise<void> {
        try {
            const currentState = await this.getUserState(facebookId)

            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    current_mode: state,
                    last_mode_change: new Date().toISOString(),
                    mode_change_count: currentState ? currentState.mode_change_count + 1 : 1,
                    bot_active: state === UserState.USING_BOT,
                    updated_at: new Date().toISOString()
                })

            logger.info('User state updated', { facebookId, state })
        } catch (error) {
            logger.error('Error updating user state', { facebookId, state, error })
        }
    }

    /**
     * Set user type
     */
    static async setUserType(facebookId: string, userType: UserType): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    user_type: userType,
                    updated_at: new Date().toISOString()
                })

            logger.info('User type updated', { facebookId, userType })
        } catch (error) {
            logger.error('Error setting user type', { facebookId, userType, error })
        }
    }

    /**
     * Get user type
     */
    static async getUserType(facebookId: string): Promise<UserType> {
        try {
            const state = await this.getUserState(facebookId)
            return state?.user_type || UserType.NEW_USER
        } catch (error) {
            logger.error('Error getting user type', { facebookId, error })
            return UserType.NEW_USER
        }
    }

    /**
     * Analyze user context
     */
    static async analyzeUserContext(facebookId: string): Promise<{ userType: UserType, userState: UserState, user: any, session: any, isInFlow: boolean, flowType?: string }> {
        try {
            const userData = await getUserByFacebookId(facebookId)
            const session = await getBotSession(facebookId)
            const userType = await this.getUserType(facebookId)

            // Map database user status to UserType if not already set in user_interactions
            let mappedUserType = userType
            if (userType === UserType.NEW_USER && userData) {
                switch (userData.status) {
                    case 'registered':
                    case 'active':
                        mappedUserType = UserType.REGISTERED_USER
                        break
                    case 'trial':
                        mappedUserType = UserType.TRIAL_USER
                        break
                    case 'pending':
                        mappedUserType = UserType.PENDING_USER
                        break
                    case 'expired':
                        mappedUserType = UserType.EXPIRED_USER
                        break
                    case 'suspended':
                        mappedUserType = UserType.EXPIRED_USER
                        break
                    default:
                        mappedUserType = UserType.NEW_USER
                }

                // Update the user type in the database if it was mapped
                if (mappedUserType !== userType) {
                    await this.setUserType(facebookId, mappedUserType)
                }
            }

            let userState = UserState.IDLE

            if (session?.current_flow) {
                switch (session.current_flow) {
                    case 'registration':
                        userState = UserState.IN_REGISTRATION
                        break
                    case 'listing':
                        userState = UserState.IN_LISTING
                        break
                    case 'search':
                        userState = UserState.IN_SEARCH
                        break
                    case 'payment':
                        userState = UserState.IN_PAYMENT
                        break
                    default:
                        userState = UserState.IDLE
                }
            }

            return {
                userType: mappedUserType,
                userState,
                user: userData,
                session,
                isInFlow: userState !== UserState.IDLE,
                flowType: session?.current_flow
            }
        } catch (error) {
            logger.error('Error analyzing user context', { facebookId, error })
            return {
                userType: UserType.NEW_USER,
                userState: UserState.IDLE,
                user: null,
                session: null,
                isInFlow: false
            }
        }
    }

    /**
     * Handle new user
     */
    static async handleNewUser(facebookId: string): Promise<void> {
        try {
            await welcomeService.sendWelcome(facebookId, WelcomeType.NEW_USER)
            await this.updateUserState(facebookId, UserState.CHOOSING)
            await this.setUserType(facebookId, UserType.NEW_USER)
            logger.info('New user processed', { facebookId })
        } catch (error) {
            logger.error('Error handling new user', { facebookId, error })
        }
    }

    /**
     * Handle use bot
     */
    static async handleUseBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserState(facebookId, UserState.USING_BOT)
            await sendMessage(facebookId, `✅ ĐÃ CHUYỂN SANG CHẾ ĐỘ BOT!\n━━━━━━━━━━━━━━━━━━━━\n🎯 Bạn có thể sử dụng tất cả tính năng bot ngay bây giờ\n━━━━━━━━━━━━━━━━━━━━`)
            await this.delay(1000)
            await this.sendBotMenu(facebookId)
            logger.info('User started using bot', { facebookId })
        } catch (error) {
            logger.error('Error handling use bot', { facebookId, error })
        }
    }

    /**
     * Handle chat with admin
     */
    static async handleChatWithAdmin(facebookId: string): Promise<void> {
        try {
            const spamResult = await AntiSpamService.checkPostbackAction({ facebook_id: facebookId }, 'CONTACT_ADMIN')
            if (spamResult.blocked) {
                logger.info('Admin chat request blocked by anti-spam', { facebookId, reason: spamResult.reason })
                if (spamResult.message) await sendMessage(facebookId, spamResult.message)
                return
            }

            await this.updateUserState(facebookId, UserState.CHATTING_ADMIN)
            await sendMessage(facebookId, `💬 ĐINH KHÁNH TÙNG ĐÃ NHẬN ĐƯỢC TIN NHẮN CỦA BẠN!\n━━━━━━━━━━━━━━━━━━━━\n⏰ Admin sẽ phản hồi trong thời gian sớm nhất\n📞 SĐT: 0982581222 (nếu cần gấp)\n━━━━━━━━━━━━━━━━━━━━`)
            logger.info('User requested admin chat', { facebookId })
        } catch (error) {
            logger.error('Error handling chat with admin', { facebookId, error })
        }
    }

    /**
     * Send bot menu
     */
    static async sendBotMenu(facebookId: string): Promise<void> {
        try {
            const context = await this.analyzeUserContext(facebookId)
            const { userType, user } = context
            const buttons = []

            // Only show registration button if user is not registered
            if (userType === UserType.NEW_USER || userType === UserType.PENDING_USER) {
                buttons.push(createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'))
            }

            // Always show main features for registered users (including trial users)
            if (userType === UserType.REGISTERED_USER || userType === UserType.TRIAL_USER) {
                buttons.push(
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('📝 ĐĂNG BÁN HÀNG', 'LISTING'),
                    createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                    createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                    createQuickReply('ℹ️ THÔNG TIN', 'INFO')
                )
            } else {
                // Show basic features for non-registered users
                buttons.push(
                    createQuickReply('🛒 ĐĂNG TIN BÁN HÀNG', 'LISTING'),
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('👥 CỘNG ĐỒNG TÂN DẬU', 'COMMUNITY'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('🏠 VỀ MENU CHÍNH', 'BACK_TO_MAIN')
                )
            }

            await sendQuickReply(facebookId, 'Chọn chức năng:', buttons)
        } catch (error) {
            logger.error('Error sending bot menu', { facebookId, error })
        }
    }

    /**
     * Get contextual menu
     */
    static async getContextualMenu(facebookId: string): Promise<any[]> {
        const context = await this.analyzeUserContext(facebookId)
        const { userType, userState, isInFlow } = context

        if (isInFlow) {
            return this.getFlowSpecificMenu(userState, context)
        }

        switch (userType) {
            case UserType.ADMIN:
                return this.getAdminMenu()
            case UserType.REGISTERED_USER:
            case UserType.TRIAL_USER:
                return this.getRegisteredUserMenu(context)
            case UserType.PENDING_USER:
                return this.getPendingUserMenu(context)
            case UserType.EXPIRED_USER:
                return this.getExpiredUserMenu()
            default:
                return this.getNewUserMenu()
        }
    }

    /**
     * Get permissions for user
     */
    static getUserPermissions(userType: UserType): UserPermissions {
        return USER_PERMISSIONS[userType] || USER_PERMISSIONS[UserType.NEW_USER]
    }

    /**
     * Check permission
     */
    static hasPermission(userType: UserType, permission: keyof UserPermissions): boolean {
        const permissions = this.getUserPermissions(userType)
        return permissions[permission] === true
    }

    /**
     * Check rate limit
     */
    static async checkRateLimit(userType: UserType, action: 'listings' | 'searches' | 'messages', facebookId: string): Promise<boolean> {
        const permissions = this.getUserPermissions(userType)
        const limit = permissions[`max${action.charAt(0).toUpperCase() + action.slice(1)}PerDay` as keyof UserPermissions] as number

        if (!limit || limit >= 999) return true
        // TODO: Implement actual rate limiting with database tracking
        return true
    }

    /**
     * Upgrade user type if eligible
     */
    static async upgradeUserTypeIfEligible(facebookId: string): Promise<void> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState || userState.user_type !== UserType.NEW_USER) return

            const userData = await getUserByFacebookId(facebookId)
            if (!userData) return

            // Check eligibility for TRIAL_USER
            if (!userData.created_at) return
            const accountAge = Date.now() - new Date(userData.created_at).getTime()
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000

            if (accountAge >= thirtyDaysInMs && userData.status === 'active') {
                const { count: transactionCount } = await supabaseAdmin
                    .from('payments')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userData.id)
                    .eq('status', 'completed')

                if (transactionCount && transactionCount >= 5) {
                    await this.setUserType(facebookId, UserType.TRIAL_USER)
                    logger.info('User upgraded to trial', { facebookId })
                }
            }
        } catch (error) {
            logger.error('Error upgrading user type', { facebookId, error })
        }
    }

    /**
     * Handle back to main
     */
    static async handleBackToMain(facebookId: string): Promise<void> {
        try {
            await welcomeService.sendWelcome(facebookId, undefined)
        } catch (error) {
            logger.error('Error handling back to main', { facebookId, error })
        }
    }

    /**
     * Update user interaction state (partial updates)
     */
    static async updateUserInteractionState(facebookId: string, updates: Partial<UserStateData>): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    facebook_id: facebookId,
                    ...updates,
                    updated_at: new Date().toISOString()
                })

            logger.debug('User interaction state updated', { facebookId, updates })
        } catch (error) {
            logger.error('Error updating user interaction state', { facebookId, updates, error })
        }
    }

    /**
     * Handle first message from user
     */
    static async handleFirstMessage(facebookId: string, userStatus: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)

            // If no state, create new
            if (!userState) {
                await this.updateUserInteractionState(facebookId, {
                    welcome_sent: false,
                    last_interaction: new Date().toISOString(),
                    interaction_count: 1,
                    bot_active: true,
                    created_at: new Date().toISOString()
                })
                return true // Need to send welcome
            }

            // Check cooldown for welcome
            const now = new Date()
            if (userState.welcome_sent && userState.last_welcome_sent) {
                const lastWelcomeTime = new Date(userState.last_welcome_sent)
                const timeDiff = now.getTime() - lastWelcomeTime.getTime()
                const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 hours

                if (timeDiff < cooldownPeriod) {
                    logger.info('Welcome cooldown active - skipping welcome', {
                        facebookId,
                        timeDiff,
                        cooldownPeriod
                    })
                    return false
                }
            }

            // Update interaction count
            await this.updateUserInteractionState(facebookId, {
                interaction_count: userState.interaction_count + 1,
                last_interaction: new Date().toISOString()
            })

            return true // Need to send welcome
        } catch (error) {
            logger.error('Error handling first message', { facebookId, error })
            return false
        }
    }

    /**
     * Handle subsequent message
     */
    static async handleSubsequentMessage(facebookId: string, message: string): Promise<void> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return

            // Check admin active
            const isAdminActive = await AdminTakeoverService.isAdminActive(facebookId)
            if (isAdminActive) return

            // Check active session
            const sessionData = await getBotSession(facebookId)
            const currentFlow = sessionData?.current_flow || null

            if (currentFlow && ['registration', 'listing', 'search', 'community'].includes(currentFlow)) {
                console.log('🔄 User in flow:', currentFlow, '- skipping interaction handling')
                return
            }

            // Hide buttons if text message
            await hideButtons(facebookId)

            // Check anti-spam
            const spamResult = await AntiSpamService.checkMessage({ facebook_id: facebookId }, message)

            if (spamResult.blocked) {
                logger.info('Message blocked due to spam detection', { facebookId, reason: spamResult.reason })
                if (spamResult.message) {
                    await sendMessage(facebookId, spamResult.message)
                }
                return
            }

            // Update interaction count
            await this.updateUserInteractionState(facebookId, {
                interaction_count: userState.interaction_count + 1,
                last_interaction: new Date().toISOString()
            })

            logger.info('Subsequent message handled successfully', { facebookId })
        } catch (error) {
            logger.error('Error handling subsequent message', { facebookId, error })
        }
    }

    /**
     * Check if should send welcome
     */
    static async shouldSendWelcome(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return true

            const now = new Date()

            // If not sent, send
            if (!userState.welcome_sent) return true

            // Check cooldown
            if (userState.last_welcome_sent) {
                const lastWelcomeTime = new Date(userState.last_welcome_sent)
                const timeDiff = now.getTime() - lastWelcomeTime.getTime()
                const cooldownPeriod = 24 * 60 * 60 * 1000 // 24 hours

                if (timeDiff < cooldownPeriod) {
                    logger.debug('Welcome still in cooldown period', { facebookId, timeDiff, cooldownPeriod })
                    return false
                }
            }

            // Check recent interaction
            const lastInteractionTime = new Date(userState.last_interaction)
            const timeSinceLastInteraction = now.getTime() - lastInteractionTime.getTime()

            if (timeSinceLastInteraction > 10 * 60 * 1000) {
                logger.debug('User has no recent interaction, skipping welcome', { facebookId, timeSinceLastInteraction })
                return false
            }

            return true
        } catch (error) {
            logger.error('Error checking if should send welcome', { facebookId, error })
            return false
        }
    }

    /**
     * Check if bot is active for user
     */
    static async isBotActive(facebookId: string): Promise<boolean> {
        try {
            const userState = await this.getUserState(facebookId)
            if (!userState) return true

            const isAdminActive = await AdminTakeoverService.isAdminActive(facebookId)
            if (isAdminActive) return false

            return userState.bot_active
        } catch (error) {
            logger.error('Error checking bot active status', { facebookId, error })
            return true
        }
    }

    /**
     * Reactivate bot for user
     */
    static async reactivateBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserInteractionState(facebookId, {
                bot_active: true,
                last_interaction: new Date().toISOString()
            })

            logger.info('Bot reactivated for user', { facebookId })
        } catch (error) {
            logger.error('Error reactivating bot', { facebookId, error })
        }
    }


    /**
     * Handle stop bot
     */
    static async handleStopBot(facebookId: string): Promise<void> {
        try {
            await this.updateUserState(facebookId, UserState.CHOOSING)
            await sendMessage(facebookId, `🛑 ĐÃ DỪNG BOT!\n━━━━━━━━━━━━━━━━━━━━\n✅ Bot đã được tạm dừng\n💬 Bạn có thể chat trực tiếp với admin\n━━━━━━━━━━━━━━━━━━━━`)
            logger.info('User stopped bot', { facebookId })
        } catch (error) {
            logger.error('Error handling stop bot', { facebookId, error })
        }
    }

    /**
     * Check if using bot
     */
    static async isUsingBot(facebookId: string): Promise<boolean> {
        const userState = await this.getUserState(facebookId)
        return userState?.current_mode === UserState.USING_BOT && userState?.bot_active === true
    }

    /**
     * Check if chatting with admin
     */
    static async isChattingWithAdmin(facebookId: string): Promise<boolean> {
        const userState = await this.getUserState(facebookId)
        return userState?.current_mode === UserState.CHATTING_ADMIN
    }

    /**
     * Reset user state
     */
    static async resetUserState(facebookId: string): Promise<void> {
        try {
            await supabaseAdmin
                .from('user_interactions')
                .update({
                    current_mode: UserState.CHOOSING,
                    bot_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', facebookId)

            logger.info('User state reset to choosing', { facebookId })
        } catch (error) {
            logger.error('Error resetting user state', { facebookId, error })
        }
    }

    /**
     * Handle incoming message
     */
    static async handleIncomingMessage(facebookId: string): Promise<UserState> {
        try {
            const currentState = await this.getUserState(facebookId)
            const userData = await getUserByFacebookId(facebookId)
            const welcomeAlreadySent = userData?.welcome_sent || userData?.welcome_message_sent
            const activeSession = await SessionManager.getSession(facebookId)

            if (activeSession) {
                logger.info('User in active session', { facebookId, flow: activeSession.current_flow })
                return UserState.USING_BOT
            }

            if (!currentState) {
                if (!welcomeAlreadySent) {
                    await this.handleNewUser(facebookId)
                    return UserState.CHOOSING
                } else {
                    await this.sendChoosingMenu(facebookId)
                    return UserState.CHOOSING
                }
            }

            return currentState.current_mode
        } catch (error) {
            logger.error('Error in handleIncomingMessage', { facebookId, error })
            await this.sendChoosingMenu(facebookId)
            return UserState.CHOOSING
        }
    }

    /**
     * Get mode stats
     */
    static async getModeStats(): Promise<Record<UserType, number>> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('user_type')

            if (error) {
                logger.error('Error getting mode stats', { error: error.message })
                return Object.values(UserType).reduce((acc, type) => { acc[type] = 0; return acc; }, {} as Record<UserType, number>)
            }

            const stats = Object.values(UserType).reduce((acc, type) => { acc[type] = 0; return acc; }, {} as Record<UserType, number>)
            data?.forEach(user => {
                const type = user.user_type as UserType
                if (type && stats[type] !== undefined) stats[type]++
            })

            return stats
        } catch (error) {
            logger.error('Exception getting mode stats', { error })
            return Object.values(UserType).reduce((acc, type) => { acc[type] = 0; return acc; }, {} as Record<UserType, number>)
        }
    }

    // Private helper methods
    static async sendChoosingMenu(facebookId: string): Promise<void> {
        logger.info('Choosing menu disabled - welcome already sent by WelcomeService', { facebookId })
    }

    private static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    private static getAdminMenu(): any[] {
        return []
    }

    private static getRegisteredUserMenu(context: any): any[] {
        const menu = [
            { title: '🏠 TRANG CHỦ', action: 'MAIN_MENU', priority: 1 },
            { title: '🛒 NIÊM YẾT SẢN PHẨM', action: 'LISTING', priority: 2 },
            { title: '🔍 TÌM KIẾM', action: 'SEARCH', priority: 3 },
            { title: '👥 CỘNG ĐỒNG', action: 'COMMUNITY', priority: 4 },
            { title: '💰 THANH TOÁN', action: 'PAYMENT', priority: 5 },
            { title: '⭐ ĐIỂM THƯỞNG', action: 'POINTS', priority: 6 },
            { title: '⚙️ CÀI ĐẶT', action: 'SETTINGS', priority: 7 }
        ]

        if (context.userType === UserType.TRIAL_USER && context.user?.membership_expires_at) {
            const daysLeft = Math.ceil((new Date(context.user.membership_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            if (daysLeft <= 3) {
                menu.unshift({ title: `⚠️ TRIAL HẾT HẠN: ${daysLeft} NGÀY`, action: 'PAYMENT_URGENT', priority: 0 })
            }
        }

        return menu
    }

    private static getPendingUserMenu(context: any): any[] {
        const menu = [
            { title: '🔍 TÌM KIẾM SẢN PHẨM', action: 'SEARCH', priority: 1 },
            { title: '👀 XEM TIN ĐĂNG', action: 'VIEW_LISTINGS', priority: 2 },
            { title: '💬 LIÊN HỆ ADMIN', action: 'CONTACT_ADMIN', priority: 3 },
            { title: 'ℹ️ THÔNG TIN', action: 'INFO', priority: 4 }
        ]

        const pendingDays = context.user?.created_at ? Math.ceil((Date.now() - new Date(context.user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
        if (pendingDays > 0) {
            menu.unshift({ title: `⏳ CHỜ DUYỆT: ${pendingDays} NGÀY`, action: 'PENDING_STATUS', priority: 0 })
        }

        return menu
    }

    private static getExpiredUserMenu(): any[] {
        return [
            { title: '💰 THANH TOÁN ĐỂ TIẾP TỤC', action: 'PAYMENT', priority: 1 },
            { title: '📝 ĐĂNG KÝ LẠI', action: 'REGISTER', priority: 2 },
            { title: 'ℹ️ THÔNG TIN', action: 'INFO', priority: 3 }
        ]
    }

    private static getNewUserMenu(): any[] {
        return [
            { title: '🚀 ĐĂNG KÝ NGAY', action: 'REGISTER', priority: 1 },
            { title: 'ℹ️ TÌM HIỂU THÊM', action: 'INFO', priority: 2 },
            { title: '💬 HỖ TRỢ', action: 'SUPPORT', priority: 3 }
        ]
    }

    private static getFlowSpecificMenu(userState: UserState, context: any): any[] {
        switch (userState) {
            case UserState.IN_REGISTRATION:
                return [
                    { title: '📝 TIẾP TỤC ĐĂNG KÝ', action: 'CONTINUE_REGISTRATION', priority: 1 },
                    { title: '❌ HỦY ĐĂNG KÝ', action: 'CANCEL_REGISTRATION', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            case UserState.IN_LISTING:
                return [
                    { title: '🛒 TIẾP TỤC NIÊM YẾT', action: 'CONTINUE_LISTING', priority: 1 },
                    { title: '❌ HỦY NIÊM YẾT', action: 'CANCEL_LISTING', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            case UserState.IN_SEARCH:
                return [
                    { title: '🔍 TIẾP TỤC TÌM KIẾM', action: 'CONTINUE_SEARCH', priority: 1 },
                    { title: '❌ HỦY TÌM KIẾM', action: 'CANCEL_SEARCH', priority: 2 },
                    { title: '🏠 VỀ TRANG CHỦ', action: 'MAIN_MENU', priority: 3 }
                ]
            default:
                return this.getNewUserMenu()
        }
    }
}
