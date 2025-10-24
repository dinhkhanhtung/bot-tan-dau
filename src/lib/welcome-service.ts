/**
 * Simplified Welcome Service
 * Simple one-time welcome message service
 */

import { logger, logUserAction, logBotEvent } from './logger'
import { errorHandler, createUserError, ErrorType } from './error-handler'
import { sendMessage, sendQuickReply, createQuickReply, sendTypingIndicator } from './facebook-api'
import { getUserByFacebookId, updateUser } from './user-service'

// Simple welcome types
export enum WelcomeType {
    NEW_USER = 'NEW_USER',
    RETURNING_USER = 'RETURNING_USER'
}

// Simple welcome message template for all users
const SIMPLE_WELCOME_TEMPLATE = {
    greeting: 'CHỌN CHẾ ĐỘ SỬ DỤNG',
    options: [
        '🤖 Dùng bot: Tự động mua bán với cộng đồng',
        '💬 Chat với admin: Đinh Khánh Tùng hỗ trợ trực tiếp'
    ],
    question: 'Bạn muốn làm gì?'
}

// Simple welcome service class
export class WelcomeService {
    private static instance: WelcomeService

    private constructor() { }

    public static getInstance(): WelcomeService {
        if (!WelcomeService.instance) {
            WelcomeService.instance = new WelcomeService()
        }
        return WelcomeService.instance
    }

    // Simple welcome message - only send once per user
    public async sendWelcome(facebookId: string, userType?: WelcomeType): Promise<void> {
        try {
            logger.info(`🎉 Starting welcome process for user: ${facebookId}`)

            // Check if welcome was already sent and cooldown period
            const user = await getUserByFacebookId(facebookId)
            if (user?.welcome_sent) {
                // Check if 24 hours have passed since last welcome
                if (user.last_welcome_sent) {
                    const lastWelcomeTime = new Date(user.last_welcome_sent)
                    const now = new Date()
                    const hoursDiff = (now.getTime() - lastWelcomeTime.getTime()) / (1000 * 60 * 60)

                    if (hoursDiff < 24) {
                        logger.info(`Welcome cooldown active for user: ${facebookId} - sent ${hoursDiff.toFixed(1)} hours ago`)
                        // Send returning user message instead
                        await this.sendReturningUserMessage(facebookId)
                        return
                    }
                } else {
                    // If welcome_sent is true but no timestamp, still skip to avoid spam
                    logger.info(`Skipping welcome for user: ${facebookId} - already sent before (no timestamp)`)
                    return
                }
            }

            // Check if user is currently in a registration flow
            const { SessionManager } = await import('./core/session-manager')
            const activeSession = await SessionManager.getSession(facebookId)
            if (activeSession && activeSession.current_flow === 'registration') {
                logger.info(`Skipping welcome for user: ${facebookId} - currently in registration flow`)
                return
            }

            logger.info(`📤 Sending welcome message to user: ${facebookId}`)

            // Send typing indicator
            await sendTypingIndicator(facebookId)

            // Send unified welcome message
            const unifiedMessage = `${SIMPLE_WELCOME_TEMPLATE.greeting}\n\n${SIMPLE_WELCOME_TEMPLATE.options.join('\n')}\n\n${SIMPLE_WELCOME_TEMPLATE.question}`
            await sendMessage(facebookId, unifiedMessage)
            logger.info(`✅ Unified welcome message sent to user: ${facebookId}`)

            // Send simple buttons
            await this.sendWelcomeButtons(facebookId)
            logger.info(`✅ Welcome buttons sent to user: ${facebookId}`)

            // Mark welcome as sent in database
            await this.markWelcomeAsSent(facebookId)
            logger.info(`✅ Welcome marked as sent for user: ${facebookId}`)

            // Log welcome sent
            logUserAction(facebookId, 'welcome_sent', { userType })
            logBotEvent('welcome_sent', { userId: facebookId, userType })

            logger.info(`🎉 Welcome process completed successfully for user: ${facebookId}`)

        } catch (error) {
            const welcomeError = createUserError(
                `Failed to send welcome message: ${error instanceof Error ? error.message : String(error)}`,
                ErrorType.USER_ERROR,
                { facebookId, userType },
                facebookId
            )

            logger.error(`Welcome message failed for user: ${facebookId}`, { userType }, error as Error)
            throw errorHandler.handleError(welcomeError)
        }
    }

    // Enhanced welcome buttons with more options - điều chỉnh theo trạng thái đăng ký
    private async sendWelcomeButtons(facebookId: string): Promise<void> {
        try {
            // Lấy thông tin user để kiểm tra trạng thái đăng ký
            const userData = await getUserByFacebookId(facebookId)

            let buttons = []

            if (!userData || userData.status === 'new_user' || userData.status === 'pending') {
                // User chưa đăng ký - hiện nhiều nút hơn
                buttons = [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('🛒 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
                ]
            } else {
                // User đã đăng ký - hiện menu đầy đủ
                buttons = [
                    createQuickReply('🤖 DÙNG BOT', 'USE_BOT'),
                    createQuickReply('💬 CHAT VỚI ADMIN', 'CHAT_ADMIN'),
                    createQuickReply('🛑 DỪNG BOT', 'STOP_BOT'),
                    createQuickReply('🔍 TÌM KIẾM NHANH', 'QUICK_SEARCH'),
                    createQuickReply('📝 ĐĂNG TIN', 'LISTING'),
                    createQuickReply('👥 CỘNG ĐỒNG', 'COMMUNITY'),
                    createQuickReply('💰 THANH TOÁN', 'PAYMENT'),
                    createQuickReply('ℹ️ THÔNG TIN', 'INFO')
                ]
            }

            await sendQuickReply(
                facebookId,
                '🎯 CHỌN CHẾ ĐỘ SỬ DỤNG\n━━━━━━━━━━━━━━━━━━━━\nChọn một tùy chọn để bắt đầu:',
                buttons
            )

            logger.info(`✅ Enhanced welcome buttons sent successfully to user: ${facebookId}`)
        } catch (error) {
            logger.error(`❌ Failed to send welcome buttons to user: ${facebookId}`, { error: error instanceof Error ? error.message : String(error) })
            throw error
        }
    }

    // Mark welcome as sent in database (simple tracking)
    private async markWelcomeAsSent(facebookId: string): Promise<void> {
        try {
            const currentTime = new Date().toISOString()

            // Check if user exists first
            const user = await getUserByFacebookId(facebookId)
            if (user) {
                // User exists, update welcome_sent and timestamp
                await updateUser(facebookId, {
                    welcome_sent: true,
                    last_welcome_sent: currentTime
                })
                logger.info(`✅ Welcome marked as sent for existing user: ${facebookId}`)
            } else {
                // User doesn't exist, create basic user record
                const { supabaseAdmin } = await import('./supabase')
                const { generateReferralCode } = await import('./utils')

                const referralCode = generateReferralCode(facebookId)

                const { error } = await supabaseAdmin
                    .from('users')
                    .insert({
                        facebook_id: facebookId,
                        name: 'User', // Temporary name
                        phone: `temp_${facebookId.slice(-15)}`, // Temporary phone - chỉ lấy 15 ký tự cuối
                        location: 'Chưa cập nhật',
                        birthday: 1981,
                        status: 'pending', // Changed from 'new_user' to 'pending' to match database constraint
                        referral_code: referralCode,
                        welcome_sent: true,
                        last_welcome_sent: currentTime
                    })

                if (error) {
                    logger.error(`Failed to create user record for welcome tracking: ${facebookId}`, { error: error.message })
                } else {
                    logger.info(`✅ Created user record and marked welcome as sent: ${facebookId}`)
                }
            }
        } catch (error) {
            logger.warn(`Failed to mark welcome as sent for user: ${facebookId}`, { error: error instanceof Error ? error.message : String(error) })
        }
    }

    // Send returning user message (within 24 hours)
    public async sendReturningUserMessage(facebookId: string): Promise<void> {
        try {
            logger.info(`📤 Sending returning user message to: ${facebookId}`)

            // Send typing indicator
            await sendTypingIndicator(facebookId)

            // Send returning user message
            const returningMessage = `Bạn đã quay lại. Bạn muốn làm gì?`
            await sendMessage(facebookId, returningMessage)
            logger.info(`✅ Returning user message sent to user: ${facebookId}`)

            // Send the same buttons as welcome (with dynamic registration status)
            await this.sendWelcomeButtons(facebookId)
            logger.info(`✅ Returning user buttons sent to user: ${facebookId}`)

        } catch (error) {
            logger.error(`❌ Failed to send returning user message to: ${facebookId}`, { error: error instanceof Error ? error.message : String(error) })
        }
    }

    // Simple personalized welcome based on user data
    public async sendPersonalizedWelcome(facebookId: string, userData: any): Promise<void> {
        try {
            // Get Facebook display name
            let displayName = 'bạn'
            try {
                const { getFacebookDisplayName } = await import('./utils')
                const facebookName = await getFacebookDisplayName(facebookId)
                if (facebookName) {
                    displayName = facebookName
                }
            } catch (error) {
                logger.warn(`Failed to get Facebook display name for user: ${facebookId}`)
            }

            // Send personalized greeting
            await sendMessage(facebookId, `🎉 Chào mừng ${displayName} đến với Bot Tân Dậu - Hỗ Trợ Chéo!`)

            // Send simple welcome
            await this.sendWelcome(facebookId, WelcomeType.NEW_USER)

        } catch (error) {
            logger.error(`Personalized welcome failed for user: ${facebookId}`, { userData }, error as Error)
            throw error
        }
    }

    // Helper method to add delay between messages
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Export singleton instance
export const welcomeService = WelcomeService.getInstance()

// Export convenience functions
export const sendWelcome = (facebookId: string, userType?: WelcomeType) =>
    welcomeService.sendWelcome(facebookId, userType)

export const sendPersonalizedWelcome = (facebookId: string, userData: any) =>
    welcomeService.sendPersonalizedWelcome(facebookId, userData)

export const sendReturningUserMessage = (facebookId: string) =>
    welcomeService.sendReturningUserMessage(facebookId)

export default welcomeService
