import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { CONFIG } from '../config'
import { logger, logUserAction, logBotEvent, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { getUserByFacebookId, getBotSession, getBotStatus } from '../database-service'
import { supabaseAdmin } from '../supabase'
import { welcomeService, WelcomeType } from '../welcome-service'
import { messageProcessor } from './message-processor'
import { FlowManager } from './flow-manager'
import { FlowInitializer } from './flow-initializer'
import { UserInteractionService } from '../user-interaction-service'
import { AdminTakeoverService } from '../admin-takeover-service'
import { UtilityHandlers } from '../handlers/utility-handlers'
import { MarketplaceHandlers } from '../handlers/marketplace-handlers'
import { UserModeService, UserMode } from './user-mode-service'

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
     * Đơn giản hóa logic với UserModeService và welcome service tích hợp
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

            // Step 3: Kiểm tra trạng thái user mode
            const currentMode = await UserModeService.getUserMode(user.facebook_id)

            // Nếu chưa có mode, kiểm tra xem đã gửi welcome chưa
            if (!currentMode) {
                const userData = await getUserByFacebookId(user.facebook_id)
                const welcomeAlreadySent = userData?.welcome_sent || userData?.welcome_message_sent

                if (!welcomeAlreadySent) {
                    // Chưa gửi welcome, gửi welcome kèm menu chọn chế độ
                    await welcomeService.sendWelcome(user.facebook_id, WelcomeType.NEW_USER)
                    // Đợi 2 giây để user đọc welcome message
                    await this.delay(2000)
                    await UserModeService.sendChoosingMenu(user.facebook_id)
                } else {
                    // Đã gửi welcome rồi, chỉ gửi menu chọn chế độ
                    await UserModeService.sendChoosingMenu(user.facebook_id)
                }
                return
            }

            // Step 4: Xử lý theo mode hiện tại
            if (currentMode.current_mode === UserMode.CHATTING_ADMIN) {
                // User đang chat với admin - không xử lý bot
                logger.info('User is chatting with admin, ignoring bot message', { facebook_id: user.facebook_id })
                return
            }

            if (currentMode.current_mode === UserMode.USING_BOT) {
                // User đang dùng bot - xử lý bình thường
                await this.handleBotUserMessage(user, text, isPostback, postback)
                return
            }

            // Nếu đang ở chế độ CHOOSING hoặc không xác định - gửi menu chọn lại
            await UserModeService.sendChoosingMenu(user.facebook_id)

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
            // Xử lý các postback đặc biệt của UserModeService
            switch (postback) {
                case 'USE_BOT':
                    await UserModeService.handleUseBot(user.facebook_id)
                    return // Không gọi FlowManager nữa
                case 'CHAT_ADMIN':
                    await UserModeService.handleChatWithAdmin(user.facebook_id)
                    return // Không gọi FlowManager nữa
                case 'BACK_TO_MAIN':
                    await UserModeService.handleBackToMain(user.facebook_id)
                    return // Không gọi FlowManager nữa
            }

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
                userState: UserState.IDLE,
                user: user,
                session: null,
                isInFlow: false
            }
        }
    }

    /**
     * Handle new user - REMOVED DUPLICATE WELCOME LOGIC
     * Welcome logic is now handled by welcome-service.ts
     */
    private static async handleNewUser(user: any): Promise<void> {
        // This method is no longer needed as welcome logic is handled by welcome-service.ts
        // Keeping method for compatibility but removing duplicate welcome messages
        console.log('handleNewUser called but welcome handled by welcome-service.ts')
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
            const trialEnd = new Date(user.trial_end)
            const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

            await sendMessage(user.facebook_id,
                `🎁 TÀI KHOẢN DÙNG THỬ\n━━━━━━━━━━━━━━━━━━━━\n⏰ Còn lại: ${daysLeft} ngày\n🎯 Sử dụng tất cả tính năng\n💳 Nâng cấp để tiếp tục\n━━━━━━━━━━━━━━━━━━━━`)

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
