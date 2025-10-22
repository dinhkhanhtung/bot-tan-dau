import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState as SmartContextUserState } from './smart-context-manager'
import { CONFIG } from '../config'
import { logger, logUserAction, logBotEvent, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { getUserByFacebookId } from '../user-service'
import { getBotSession, getBotStatus } from '../bot-service'
import { supabaseAdmin } from '../supabase'
import { welcomeService, WelcomeType } from '../welcome-service'
import { messageProcessor } from './message-processor'
import { FlowManager } from './flow-manager'
import { FlowInitializer } from './flow-initializer'
import { UserInteractionService } from '../user-interaction-service'
import { AdminTakeoverService } from '../admin-takeover-service'
import { UtilityHandlers } from '../handlers/utility-handlers'
import { MarketplaceHandlers } from '../handlers/marketplace-handlers'
import { UserStateManager, UserState } from './user-state-manager'

/**
 * Unified Bot System - Main entry point for bot message processing
 * Handles all incoming messages with proper routing and flow management
 */
export class UnifiedBotSystem {
    private static initialized = false

    /**
     * Initialize the bot system (call once at startup)
     */
    static initialize(): void {
        if (this.initialized) {
            console.log('⚠️ Bot system already initialized')
            return
        }

        console.log('🚀 Initializing Unified Bot System...')
        FlowInitializer.initialize()
        this.initialized = true
        console.log('✅ Unified Bot System initialized successfully')
    }

    /**
     * Main entry point for processing all incoming messages
     * Sử dụng UserStateManager thống nhất để tránh xung đột logic
     */
    static async handleMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        const startTime = Date.now()

        try {
            logger.info('Processing message', {
                facebook_id: user.facebook_id,
                text: text,
                isPostback: isPostback,
                postback: postback
            })

            // Step 1: Check bot status
            const botStatus = await getBotStatus()
            if (botStatus === 'stopped') {
                logger.info('Bot is stopped, ignoring message', { facebook_id: user.facebook_id })
                return
            }

            // Step 2: Check if admin is active for this user
            const isAdminActive = await AdminTakeoverService.isAdminActive(user.facebook_id)
            if (isAdminActive) {
                logger.info('Admin is active for user, ignoring bot message', { facebook_id: user.facebook_id })
                return
            }

            // Step 3: Xử lý postback đặc biệt trước (cho user đang chọn mode)
            if (isPostback && postback) {
                switch (postback) {
                    case 'USE_BOT':
                        await UserStateManager.handleUseBot(user.facebook_id)
                        return
                    case 'CHAT_ADMIN':
                        await UserStateManager.handleChatWithAdmin(user.facebook_id)
                        return
                    case 'BACK_TO_MAIN':
                        await UserStateManager.handleBackToMain(user.facebook_id)
                        return
                }

                // Route all other postbacks (e.g., REGISTER) directly to FlowManager
                // to avoid welcome/choosing logic interfering before a flow starts
                await FlowManager.handlePostback(user, postback)
                return
            }

            // Step 4: SIMPLIFIED ROUTING - Check session first, then state
            const { SessionManager } = await import('./session-manager')
            const activeSession = await SessionManager.getSession(user.facebook_id)

            if (activeSession) {
                // User has active session - let FlowManager handle it
                logger.info('User has active session, routing to FlowManager', {
                    facebook_id: user.facebook_id,
                    flow: activeSession.current_flow
                })
                await this.handleBotUserMessage(user, text, isPostback, postback)
                return
            }

            // No active session - check user state
            const currentState = await UserStateManager.getUserState(user.facebook_id)

            if (!currentState) {
                // User mới - xử lý welcome và chuyển sang choosing mode
                await UserStateManager.handleNewUser(user.facebook_id)
                return
            }

            // Handle based on current state
            if (currentState.current_mode === UserState.CHATTING_ADMIN) {
                logger.info('User is chatting with admin, ignoring bot message', { facebook_id: user.facebook_id })
                return
            }

            if (currentState.current_mode === UserState.USING_BOT) {
                await this.handleBotUserMessage(user, text, isPostback, postback)
                return
            }

            if (currentState.current_mode === UserState.CHOOSING) {
                if (isPostback && postback) {
                    await FlowManager.handlePostback(user, postback)
                } else {
                    // For text messages in CHOOSING state, don't call FlowManager
                    // Let UserStateManager handle it
                    await this.handleDefaultMessage(user)
                }
                return
            }

            // Fallback - send choosing menu
            await UserStateManager.sendChoosingMenu(user.facebook_id)

            const duration = Date.now() - startTime
            logBotEvent('message_processed', {
                facebook_id: user.facebook_id,
                duration,
                isPostback: !!isPostback
            })

        } catch (error) {
            const duration = Date.now() - startTime
            const messageError = createUserError(
                `Message processing failed: ${error instanceof Error ? error.message : String(error)}`,
                ErrorType.USER_ERROR,
                {
                    facebook_id: user.facebook_id,
                    text,
                    isPostback,
                    postback,
                    duration
                },
                user.facebook_id
            )

            logError(messageError, { operation: 'message_processing', user, text, isPostback, postback })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý tin nhắn của user đang dùng bot
     */
    private static async handleBotUserMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        try {
            // Xử lý postback
            if (isPostback && postback) {
                await this.handleBotPostback(user, postback)
                return
            }

            // Xử lý text message
            if (text) {
                // Thử xử lý bằng handlers trước
                const handledByUtility = await UtilityHandlers.handleSpecialKeywords(user, text)
                if (!handledByUtility) {
                    const handledByMarketplace = await MarketplaceHandlers.handleMarketplaceKeywords(user, text)
                    if (!handledByMarketplace) {
                        // Không handler nào xử lý được, dùng FlowManager
                        await FlowManager.handleMessage(user, text)
                    }
                }
            } else {
                // No text message - send default message based on user type
                await this.handleDefaultMessage(user)
            }
        } catch (error) {
            logError(error as Error, { operation: 'handle_bot_user_message', user, text, postback })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Xử lý postback cho user đang dùng bot
     */
    private static async handleBotPostback(user: any, postback: string): Promise<void> {
        try {
            // Các postback đặc biệt đã được xử lý ở handleMessage rồi
            // Các postback khác xử lý bằng FlowManager
            await FlowManager.handlePostback(user, postback)
        } catch (error) {
            logError(error as Error, { operation: 'handle_bot_postback', user, postback })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle default message when no flow is triggered
     */
    static async handleDefaultMessage(user: any): Promise<void> {
        try {
            // Analyze user context
            const context = await this.analyzeUserContext(user)

            switch (context.userType) {
                case UserType.NEW_USER:
                    await this.handleNewUser(user)
                    break
                case UserType.PENDING_USER:
                    await this.handlePendingUser(user)
                    break
                case UserType.REGISTERED_USER:
                    await this.handleRegisteredUser(user)
                    break
                case UserType.TRIAL_USER:
                    await this.handleTrialUser(user)
                    break
                case UserType.EXPIRED_USER:
                    await this.handleExpiredUser(user)
                    break
                default:
                    await this.handleUnknownUser(user)
            }

        } catch (error) {
            logError(error as Error, { operation: 'handle_default_message', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Analyze user context
     */
    private static async analyzeUserContext(user: any): Promise<UserContext> {
        try {
            return await SmartContextManager.analyzeUserContext(user)
        } catch (error) {
            logError(error as Error, { operation: 'analyze_user_context', user })
            return {
                userType: UserType.NEW_USER,
                userState: SmartContextUserState.IDLE,
                user: user,
                session: null,
                isInFlow: false
            }
        }
    }

    /**
     * Handle new user - delegate to UserStateManager to send welcome once
     */
    private static async handleNewUser(user: any): Promise<void> {
        try {
            // Send welcome via WelcomeService (through UserStateManager)
            await UserStateManager.handleNewUser(user.facebook_id)
        } catch (error) {
            logger.error('Error handling new user in UnifiedBotSystem', { facebookId: user.facebook_id, error })
        }
    }

    /**
     * Handle pending user
     */
    private static async handlePendingUser(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `⏳ TÀI KHOẢN ĐANG CHỜ DUYỆT\n━━━━━━━━━━━━━━━━━━━━\n📋 Đơn đăng ký của bạn đang được xem xét\n⏰ Thời gian duyệt: 1-2 ngày làm việc\n📞 Liên hệ admin nếu cần hỗ trợ\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(user.facebook_id, 'Tùy chọn:', [
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

        } catch (error) {
            logError(error as Error, { operation: 'handle_pending_user', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle registered user
     */
    private static async handleRegisteredUser(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `👋 CHÀO MỪNG TRỞ LẠI!\n━━━━━━━━━━━━━━━━━━━━\n🎯 Bạn có thể sử dụng tất cả tính năng\n🛒 Đăng tin bán hàng\n🔍 Tìm kiếm sản phẩm\n👥 Tham gia cộng đồng\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(user.facebook_id, 'Chọn tính năng:', [
                createQuickReply('📝 ĐĂNG TIN', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

        } catch (error) {
            logError(error as Error, { operation: 'handle_registered_user', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle trial user
     */
    private static async handleTrialUser(user: any): Promise<void> {
        try {
            // Fix: Use membership_expires_at instead of trial_end
            const expiryDate = user.membership_expires_at
            let daysLeft = 0

            if (expiryDate) {
                const trialEnd = new Date(expiryDate)
                const now = new Date()
                const diffTime = trialEnd.getTime() - now.getTime()
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                daysLeft = Math.max(daysLeft, 0) // Ensure non-negative
            }

            await sendMessage(user.facebook_id,
                `🎁 TÀI KHOẢN DÙNG THỬ\n━━━━━━━━━━━━━━━━━━━━\n⏰ Còn lại: ${daysLeft} ngày\n🎯 Sử dụng FULL tính năng miễn phí\n💳 Nâng cấp để tiếp tục\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(user.facebook_id, 'Chọn tính năng:', [
                createQuickReply('📝 ĐĂNG TIN', 'LISTING'),
                createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                createQuickReply('💳 NÂNG CẤP', 'UPGRADE'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

        } catch (error) {
            logError(error as Error, { operation: 'handle_trial_user', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle expired user
     */
    private static async handleExpiredUser(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `⏰ TÀI KHOẢN ĐÃ HẾT HẠN\n━━━━━━━━━━━━━━━━━━━━\n💳 Gia hạn để tiếp tục sử dụng\n🎁 Ưu đãi đặc biệt cho thành viên cũ\n📞 Liên hệ admin để được hỗ trợ\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(user.facebook_id, 'Tùy chọn:', [
                createQuickReply('💳 GIA HẠN', 'RENEW'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

        } catch (error) {
            logError(error as Error, { operation: 'handle_expired_user', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle unknown user
     */
    private static async handleUnknownUser(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id,
                `❓ KHÔNG XÁC ĐỊNH ĐƯỢC TRẠNG THÁI\n━━━━━━━━━━━━━━━━━━━━\n🔄 Vui lòng thử lại sau\n📞 Liên hệ admin nếu vấn đề tiếp tục\n━━━━━━━━━━━━━━━━━━━━`)

            await sendQuickReply(user.facebook_id, 'Tùy chọn:', [
                createQuickReply('🔄 THỬ LẠI', 'RETRY'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                createQuickReply('ℹ️ THÔNG TIN', 'INFO')
            ])

        } catch (error) {
            logError(error as Error, { operation: 'handle_unknown_user', user })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Send error message
     */
    private static async sendErrorMessage(facebookId: string): Promise<void> {
        try {
            await sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        } catch (error) {
            logError(error as Error, { operation: 'send_error_message', facebookId })
        }
    }

    /**
     * Helper method to add delay between messages
     */
    private static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
