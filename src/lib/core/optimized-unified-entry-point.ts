/**
 * Optimized Unified Bot System
 * Hệ thống bot tối ưu với Message Processor và Connection Pooling
 */

import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { CONFIG } from '../config'
import { logger, logUserAction, logBotEvent, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { getUserByFacebookId, getBotSession, updateBotSession, getBotStatus } from '../database-service'
import { welcomeService, WelcomeType } from '../welcome-service'
import { messageProcessor, ProcessingStage } from './message-processor'
import { dbPool } from '../database-connection-pool'

// Optimized Unified Bot System
export class OptimizedUnifiedBotSystem {
    private static processingStats = {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageProcessingTime: 0,
        lastResetTime: Date.now()
    }

    /**
     * Main entry point - Xử lý tin nhắn với pipeline tối ưu
     */
    static async handleMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        const startTime = Date.now()
        this.processingStats.totalMessages++

        try {
            logger.info('Processing message (optimized)', {
                facebook_id: user.facebook_id,
                text: text,
                isPostback: isPostback,
                postback: postback,
                totalMessages: this.processingStats.totalMessages
            })

            // Use Message Processor for advanced pipeline
            await messageProcessor.processMessage(user, text, isPostback, postback)

            this.processingStats.successfulMessages++
            const duration = Date.now() - startTime
            this.updateAverageProcessingTime(duration)

            logBotEvent('message_processed_optimized', {
                facebook_id: user.facebook_id,
                duration,
                isPostback: !!isPostback,
                success: true
            })

        } catch (error) {
            this.processingStats.failedMessages++
            const duration = Date.now() - startTime

            logger.error('Message processing failed (optimized)', {
                facebook_id: user.facebook_id,
                error: error instanceof Error ? error.message : String(error),
                duration
            })

            // Fallback to legacy processing
            try {
                await this.handleMessageLegacy(user, text, isPostback, postback)
            } catch (fallbackError) {
                logError(fallbackError as Error, { 
                    operation: 'message_processing_fallback', 
                    user, 
                    text, 
                    isPostback, 
                    postback 
                })
                await this.sendErrorMessage(user.facebook_id)
            }
        }
    }

    /**
     * Legacy message handling (fallback)
     */
    private static async handleMessageLegacy(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        const startTime = Date.now()

        try {
            // Bước 1: KIỂM TRA BOT STATUS
            const botStatus = await getBotStatus()
            if (botStatus === 'stopped') {
                logger.info('Bot is stopped, ignoring message', { facebook_id: user.facebook_id })
                return
            }

            // Bước 2: KIỂM TRA ADMIN (ưu tiên cao nhất)
            const isAdminUser = await this.checkAdminStatus(user.facebook_id)
            if (isAdminUser) {
                logger.info('Admin user detected', { facebook_id: user.facebook_id })
                await this.handleAdminMessage(user, text, isPostback, postback)
                return
            }

            // Bước 3: KIỂM TRA ADMIN CHAT MODE
            if (text && (text.toLowerCase().includes('/admin') || text.toLowerCase().includes('admin'))) {
                const isAdminUser2 = await this.checkAdminStatus(user.facebook_id)
                if (isAdminUser2) {
                    logger.info('Admin command detected', { facebook_id: user.facebook_id })
                    await this.showAdminDashboard(user)
                    return
                }
            }

            const isInAdminChat = await this.checkAdminChatMode(user.facebook_id)
            if (isInAdminChat) {
                await sendMessage(user.facebook_id, '💬 Bạn đang trong chế độ chat với admin. Bot sẽ tạm dừng để admin có thể hỗ trợ bạn trực tiếp.')
                return
            }

            // Bước 4: KIỂM TRA SESSION VÀ FLOW
            const session = await this.getUserSession(user.facebook_id)
            const currentFlow = session?.current_flow || null

            logger.debug('Session check', { currentFlow, session })

            // Nếu đang trong flow hợp lệ, xử lý flow trước
            if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
                logger.info('User in active flow', { currentFlow, facebook_id: user.facebook_id })
                await this.handleFlowMessage(user, text, session)
                return
            }

            // Bước 5: XỬ LÝ TIN NHẮN THƯỜNG
            if (isPostback && postback) {
                await this.handlePostbackAction(user, postback)
            } else if (text) {
                await this.handleTextMessage(user, text)
            } else {
                await this.handleDefaultMessage(user)
            }

            const duration = Date.now() - startTime
            logBotEvent('message_processed_legacy', {
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

            logError(messageError, { operation: 'message_processing_legacy', user, text, isPostback, postback })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Kiểm tra trạng thái admin với caching
     */
    private static async checkAdminStatus(facebookId: string): Promise<boolean> {
        try {
            const { isAdmin } = await import('../utils')
            const result = await isAdmin(facebookId)
            logger.debug('Admin status check', { facebook_id: facebookId, isAdmin: result })
            return result
        } catch (error) {
            logError(error as Error, { operation: 'admin_status_check', facebook_id: facebookId })
            return false
        }
    }

    /**
     * Kiểm tra admin chat mode với caching
     */
    private static async checkAdminChatMode(facebookId: string): Promise<boolean> {
        try {
            const { isUserInAdminChat } = await import('../admin-chat')
            const result = await isUserInAdminChat(facebookId)
            logger.debug('Admin chat mode check', { facebook_id: facebookId, isInAdminChat: result })
            return result
        } catch (error) {
            logError(error as Error, { operation: 'admin_chat_mode_check', facebook_id: facebookId })
            return false
        }
    }

    /**
     * Lấy session với connection pooling
     */
    private static async getUserSession(facebookId: string): Promise<any> {
        try {
            return await dbPool.executeQuery(
                'getBotSession',
                async (client) => {
                    const { data, error } = await client
                        .from('bot_sessions')
                        .select('*')
                        .eq('user_id', facebookId)
                        .single()

                    if (error && error.code !== 'PGRST116') {
                        throw new Error(`Database error: ${error.message}`)
                    }

                    return data
                }
            )
        } catch (error) {
            logError(error as Error, { operation: 'get_user_session', facebook_id: facebookId })
            return null
        }
    }

    /**
     * Xử lý tin nhắn text với context analysis
     */
    private static async handleTextMessage(user: any, text: string): Promise<void> {
        try {
            const context = await this.analyzeUserContext(user)
            
            if (context.userType === UserType.NEW_USER) {
                await this.handleNewUserText(user, text)
            } else if (context.userType === UserType.PENDING_USER) {
                await this.handlePendingUserText(user, text)
            } else if (context.userType === UserType.REGISTERED_USER || context.userType === UserType.TRIAL_USER) {
                await this.handleRegisteredUserText(user, text)
            } else {
                await this.handleDefaultMessage(user)
            }
        } catch (error) {
            logError(error as Error, { 
                operation: 'text_message_handling', 
                facebook_id: user.facebook_id,
                text 
            })
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Phân tích ngữ cảnh user với caching
     */
    private static async analyzeUserContext(user: any): Promise<{ userType: UserType, user?: any }> {
        try {
            // 1. Kiểm tra Admin trước (ưu tiên cao nhất)
            const isAdminUser = await this.checkAdminStatus(user.facebook_id)
            if (isAdminUser) {
                return { userType: UserType.ADMIN }
            }

            // 2. Lấy thông tin user từ database với connection pooling
            const userData = await dbPool.executeQuery(
                'getUserByFacebookId',
                async (client) => {
                    const { data, error } = await client
                        .from('users')
                        .select('*')
                        .eq('facebook_id', user.facebook_id)
                        .single()

                    if (error && error.code !== 'PGRST116') {
                        throw new Error(`Database error: ${error.message}`)
                    }

                    return data
                }
            )

            // Nếu không tìm thấy user trong database -> NEW USER
            if (!userData) {
                return { userType: UserType.NEW_USER, user: null }
            }

            // 3. KIỂM TRA TRẠNG THÁI USER
            if (!userData.name || !userData.phone) {
                return { userType: UserType.NEW_USER, user: null }
            }

            if (userData.status === 'pending') {
                return { userType: UserType.PENDING_USER, user: userData }
            }

            if (userData.status === 'registered' || userData.status === 'trial') {
                return { userType: UserType.REGISTERED_USER, user: userData }
            }

            if (userData.status === 'expired') {
                return { userType: UserType.EXPIRED_USER, user: userData }
            }

            return { userType: UserType.NEW_USER, user: null }

        } catch (error) {
            logError(error as Error, { 
                operation: 'analyze_user_context', 
                facebook_id: user.facebook_id 
            })
            return { userType: UserType.NEW_USER, user: null }
        }
    }

    /**
     * Xử lý tin nhắn cho user mới
     */
    private static async handleNewUserText(user: any, text: string): Promise<void> {
        try {
            const { checkUserBotMode } = await import('../anti-spam')
            const isInBotMode = await checkUserBotMode(user.facebook_id)

            if (!isInBotMode) {
                logger.info('New user not in bot mode - processing as normal message', { 
                    facebook_id: user.facebook_id 
                })

                const { incrementNormalMessageCount, getUserChatBotOfferCount } = await import('../anti-spam')
                incrementNormalMessageCount(user.facebook_id)
                const offerData = getUserChatBotOfferCount(user.facebook_id)
                const currentCount = offerData?.count || 0

                if (currentCount === 1) {
                    await welcomeService.sendWelcome(user.facebook_id, WelcomeType.NEW_USER)
                } else if (currentCount === 2) {
                    await sendMessage(user.facebook_id, '💬 Tùng đã nhận được tin nhắn của bạn và sẽ phản hồi sớm nhất có thể!')
                } else {
                    logger.info('Bot stopped after 3rd message', { facebook_id: user.facebook_id })
                }
                return
            }

            const session = await this.getUserSession(user.facebook_id)
            const currentFlow = session?.current_flow || null

            if (currentFlow === 'registration') {
                await this.handleFlowMessage(user, text, session)
                return
            }

            const { handleAntiSpam } = await import('../anti-spam')
            const spamResult = await handleAntiSpam(user.facebook_id, text, user.status || 'new', currentFlow)

            if (spamResult.block) {
                logger.warn('User blocked due to spam', { 
                    facebook_id: user.facebook_id,
                    reason: spamResult.message 
                })
                return
            }

            if (spamResult.action === 'none' && spamResult.message) {
                return
            }

            if (spamResult.action === 'none' && !spamResult.message && !spamResult.block) {
                if (text.includes('đăng ký') || text.includes('ĐĂNG KÝ')) {
                    await this.startRegistration(user)
                } else if (text.includes('thông tin') || text.includes('THÔNG TIN')) {
                    await this.showBotInfo(user)
                } else if (text.includes('hỗ trợ') || text.includes('HỖ TRỢ')) {
                    await this.showSupportInfo(user)
                } else {
                    await welcomeService.sendWelcome(user.facebook_id, WelcomeType.NEW_USER)
                }
            }

        } catch (error) {
            logError(error as Error, { 
                operation: 'new_user_text_handling', 
                facebook_id: user.facebook_id,
                text 
            })
        }
    }

    /**
     * Xử lý tin nhắn cho user đã đăng ký
     */
    private static async handleRegisteredUserText(user: any, text: string): Promise<void> {
        try {
            // Implementation for registered users
            await sendMessage(user.facebook_id, 'Xin chào! Bạn đã là thành viên của cộng đồng Tân Dậu.')
        } catch (error) {
            logError(error as Error, { 
                operation: 'registered_user_text_handling', 
                facebook_id: user.facebook_id,
                text 
            })
        }
    }

    /**
     * Xử lý tin nhắn cho user đang chờ duyệt
     */
    private static async handlePendingUserText(user: any, text: string): Promise<void> {
        try {
            // Implementation for pending users
            await sendMessage(user.facebook_id, 'Tài khoản của bạn đang chờ duyệt. Vui lòng chờ admin xác nhận.')
        } catch (error) {
            logError(error as Error, { 
                operation: 'pending_user_text_handling', 
                facebook_id: user.facebook_id,
                text 
            })
        }
    }

    /**
     * Xử lý postback actions
     */
    private static async handlePostbackAction(user: any, postback: string): Promise<void> {
        try {
            // Implementation for postback actions
            logger.info('Handling postback action', { 
                facebook_id: user.facebook_id, 
                postback 
            })
        } catch (error) {
            logError(error as Error, { 
                operation: 'postback_action_handling', 
                facebook_id: user.facebook_id,
                postback 
            })
        }
    }

    /**
     * Xử lý tin nhắn mặc định
     */
    private static async handleDefaultMessage(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, 'Xin chào! Tôi có thể giúp gì cho bạn?')
        } catch (error) {
            logError(error as Error, { 
                operation: 'default_message_handling', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Xử lý admin message
     */
    private static async handleAdminMessage(user: any, text: string, isPostback?: boolean, postback?: string): Promise<void> {
        try {
            // Implementation for admin messages
            logger.info('Handling admin message', { 
                facebook_id: user.facebook_id, 
                text,
                isPostback,
                postback 
            })
        } catch (error) {
            logError(error as Error, { 
                operation: 'admin_message_handling', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Hiển thị admin dashboard
     */
    private static async showAdminDashboard(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, '🔧 Admin Dashboard - Chức năng đang được phát triển')
        } catch (error) {
            logError(error as Error, { 
                operation: 'show_admin_dashboard', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Xử lý flow message
     */
    private static async handleFlowMessage(user: any, text: string, session: any): Promise<void> {
        try {
            // Implementation for flow messages
            logger.info('Handling flow message', { 
                facebook_id: user.facebook_id, 
                text,
                currentFlow: session?.current_flow 
            })
        } catch (error) {
            logError(error as Error, { 
                operation: 'flow_message_handling', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Bắt đầu đăng ký
     */
    private static async startRegistration(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, '🚀 Bắt đầu quá trình đăng ký thành viên...')
        } catch (error) {
            logError(error as Error, { 
                operation: 'start_registration', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Hiển thị thông tin bot
     */
    private static async showBotInfo(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, 'ℹ️ Thông tin về Bot Tân Dậu - Hỗ Trợ Chéo')
        } catch (error) {
            logError(error as Error, { 
                operation: 'show_bot_info', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Hiển thị thông tin hỗ trợ
     */
    private static async showSupportInfo(user: any): Promise<void> {
        try {
            await sendMessage(user.facebook_id, '💬 Thông tin hỗ trợ - Liên hệ admin để được giúp đỡ')
        } catch (error) {
            logError(error as Error, { 
                operation: 'show_support_info', 
                facebook_id: user.facebook_id 
            })
        }
    }

    /**
     * Gửi tin nhắn lỗi
     */
    private static async sendErrorMessage(facebookId: string): Promise<void> {
        try {
            await sendMessage(facebookId, CONFIG.ERRORS.INTERNAL_ERROR)
        } catch (error) {
            logError(error as Error, { 
                operation: 'send_error_message', 
                facebook_id: facebookId 
            })
        }
    }

    /**
     * Cập nhật thời gian xử lý trung bình
     */
    private static updateAverageProcessingTime(duration: number): void {
        const total = this.processingStats.successfulMessages
        const current = this.processingStats.averageProcessingTime
        this.processingStats.averageProcessingTime = ((current * (total - 1)) + duration) / total
    }

    /**
     * Lấy thống kê xử lý
     */
    static getProcessingStats() {
        return {
            ...this.processingStats,
            successRate: this.processingStats.totalMessages > 0 
                ? (this.processingStats.successfulMessages / this.processingStats.totalMessages) * 100 
                : 0,
            uptime: Date.now() - this.processingStats.lastResetTime
        }
    }

    /**
     * Reset thống kê
     */
    static resetStats(): void {
        this.processingStats = {
            totalMessages: 0,
            successfulMessages: 0,
            failedMessages: 0,
            averageProcessingTime: 0,
            lastResetTime: Date.now()
        }
    }
}
