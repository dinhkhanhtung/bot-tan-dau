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
    greeting: '🎉 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo! 👋',
    description: '🌟 Mình có thể giúp bạn kết nối và hỗ trợ trong cộng đồng. Bạn muốn làm gì hôm nay?',
    features: [
        '🔍 Tìm kiếm sản phẩm',
        '🛒 Đăng bán sản phẩm',
        '👥 Kết nối cộng đồng',
        '💬 Hỗ trợ trực tiếp'
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
            // Check if welcome was already sent (one-time welcome)
            const user = await getUserByFacebookId(facebookId)
            if (user?.welcome_sent) {
                logger.debug(`Skipping welcome for user: ${facebookId} - already sent before`)
                return
            }

            // Check if user is currently in a registration flow
            const { SessionManager } = await import('./core/session-manager')
            const activeSession = await SessionManager.getSession(facebookId)
            if (activeSession && activeSession.current_flow === 'registration') {
                logger.debug(`Skipping welcome for user: ${facebookId} - currently in registration flow`)
                return
            }

            // Send typing indicator
            await sendTypingIndicator(facebookId)

            // Send simple greeting and description
            const welcomeMessage = `${SIMPLE_WELCOME_TEMPLATE.greeting}\n\n${SIMPLE_WELCOME_TEMPLATE.description}`
            await sendMessage(facebookId, welcomeMessage)

            // Send features as bullet points
            const featuresMessage = SIMPLE_WELCOME_TEMPLATE.features.join('\n')
            await sendMessage(facebookId, featuresMessage)

            // Send simple buttons
            await this.sendWelcomeButtons(facebookId)

            // Mark welcome as sent in database
            await this.markWelcomeAsSent(facebookId)

            // Log welcome sent
            logUserAction(facebookId, 'welcome_sent', { userType })
            logBotEvent('welcome_sent', { userId: facebookId, userType })

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
        // Check user registration status
        const user = await getUserByFacebookId(facebookId)
        const isRegistered = user && (user.status === 'registered' || user.status === 'trial')

        const buttons = [
            createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
            createQuickReply('🛒 ĐĂNG BÁN', 'LISTING')
        ]

        // Only show registration button if user is not registered
        if (!isRegistered) {
            buttons.push(createQuickReply('👥 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'))
        }

        buttons.push(createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN'))

        await sendQuickReply(
            facebookId,
            'Chọn một trong các tùy chọn bên dưới để bắt đầu:',
            buttons
        )
    }

    // Mark welcome as sent in database (simple tracking)
    private async markWelcomeAsSent(facebookId: string): Promise<void> {
        try {
            await updateUser(facebookId, {
                welcome_sent: true
            })
        } catch (error) {
            logger.warn(`Failed to mark welcome as sent for user: ${facebookId}`, error as Error)
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
