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
    greeting: '👋 XIN CHÀO!\n━━━━━━━━━━━━━━━━━━━━\nChào mừng bạn đến với cộng đồng Tân Dậu!',
    description: '💡 Tôi có thể giúp bạn:',
    features: [
        '• Đăng ký thành viên',
        '• Tìm kiếm sản phẩm',
        '• Đăng tin bán hàng',
        '• Tham gia cộng đồng',
        '• Thanh toán dịch vụ'
    ]
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

            // Check if welcome was already sent (one-time welcome)
            const user = await getUserByFacebookId(facebookId)
            if (user?.welcome_sent) {
                logger.info(`Skipping welcome for user: ${facebookId} - already sent before`)
                return
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

            // Send simple greeting and description
            const welcomeMessage = `${SIMPLE_WELCOME_TEMPLATE.greeting}\n\n${SIMPLE_WELCOME_TEMPLATE.description}`
            await sendMessage(facebookId, welcomeMessage)
            logger.info(`✅ Welcome message sent to user: ${facebookId}`)

            // Send features as bullet points
            const featuresMessage = SIMPLE_WELCOME_TEMPLATE.features.join('\n')
            await sendMessage(facebookId, featuresMessage)
            logger.info(`✅ Features message sent to user: ${facebookId}`)

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

    // Simple welcome buttons for common actions
    private async sendWelcomeButtons(facebookId: string): Promise<void> {
        try {
            // For new users, always show registration button
            // Don't check user status to avoid database errors
            const buttons = [
                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('🛒 ĐĂNG BÁN', 'LISTING'),
                createQuickReply('👥 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
            ]

            await sendQuickReply(
                facebookId,
                'Chọn một trong các tùy chọn bên dưới để bắt đầu:',
                buttons
            )

            logger.info(`✅ Welcome buttons sent successfully to user: ${facebookId}`)
        } catch (error) {
            logger.error(`❌ Failed to send welcome buttons to user: ${facebookId}`, { error: error instanceof Error ? error.message : String(error) })
            throw error
        }
    }

    // Mark welcome as sent in database (simple tracking)
    private async markWelcomeAsSent(facebookId: string): Promise<void> {
        try {
            // Check if user exists first
            const user = await getUserByFacebookId(facebookId)
            if (user) {
                // User exists, update welcome_sent
                await updateUser(facebookId, {
                    welcome_sent: true
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
                        phone: `temp_${facebookId}`, // Temporary phone
                        location: 'Chưa cập nhật',
                        birthday: 1981,
                        status: 'new_user',
                        referral_code: referralCode,
                        welcome_sent: true
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

export default welcomeService
