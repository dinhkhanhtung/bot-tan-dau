/**
 * Centralized Welcome Service
 * Service chào mừng tập trung với logic thông minh và A/B testing
 */

import { CONFIG } from './config'
import { logger, logUserAction, logBotEvent } from './logger'
import { errorHandler, createUserError, ErrorType } from './error-handler'
import { sendMessage, sendQuickReply, createQuickReply, sendTypingIndicator } from './facebook-api'
import { getUserByFacebookId, updateUser } from './database-service'

// Welcome message types
export enum WelcomeType {
    NEW_USER = 'NEW_USER',
    RETURNING_USER = 'RETURNING_USER',
    PENDING_USER = 'PENDING_USER',
    EXPIRED_USER = 'EXPIRED_USER',
    ADMIN = 'ADMIN'
}

// Welcome message templates
const WELCOME_TEMPLATES = {
    [WelcomeType.NEW_USER]: {
        greeting: '🎉 Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!',
        description: '🤖 Tôi là trợ lý AI giúp bạn kết nối và mua bán trong cộng đồng Tân Dậu',
        features: [
            '🛒 Tìm kiếm và niêm yết sản phẩm',
            '💬 Kết nối với người dùng khác',
            '📊 Xem thống kê và báo cáo',
            '🎁 Nhận điểm thưởng và quà tặng'
        ],
        callToAction: 'Bạn muốn bắt đầu với chức năng nào?'
    },
    [WelcomeType.RETURNING_USER]: {
        greeting: '👋 Chào mừng bạn quay trở lại!',
        description: '🤖 Tôi đã sẵn sàng hỗ trợ bạn tiếp tục hành trình trong cộng đồng Tân Dậu',
        features: [
            '📈 Xem thống kê hoạt động của bạn',
            '🛒 Tiếp tục tìm kiếm sản phẩm',
            '💬 Kiểm tra tin nhắn mới',
            '🎁 Xem điểm thưởng hiện tại'
        ],
        callToAction: 'Bạn muốn làm gì hôm nay?'
    },
    [WelcomeType.PENDING_USER]: {
        greeting: '⏳ Chào mừng bạn đến với Bot Tân Dậu - Hỗ Trợ Chéo!',
        description: '📋 Tài khoản của bạn đang chờ Admin duyệt. Trong thời gian này, bạn có thể:',
        features: [
            '🔍 Tìm kiếm và xem sản phẩm',
            '👀 Duyệt qua các tin đăng',
            '💬 Liên hệ Admin để được hỗ trợ',
            'ℹ️ Tìm hiểu thêm về cộng đồng'
        ],
        callToAction: 'Bạn muốn khám phá gì trước?'
    },
    [WelcomeType.EXPIRED_USER]: {
        greeting: '⏰ Chào mừng bạn quay trở lại!',
        description: '💰 Tài khoản của bạn đã hết hạn. Để tiếp tục sử dụng đầy đủ tính năng, vui lòng gia hạn:',
        features: [
            '💳 Thanh toán phí duy trì',
            '📊 Xem lịch sử giao dịch',
            '🎁 Nhận ưu đãi gia hạn',
            '💬 Liên hệ hỗ trợ'
        ],
        callToAction: 'Bạn muốn gia hạn ngay không?'
    },
    [WelcomeType.ADMIN]: {
        greeting: '🔧 Chào mừng Admin!',
        description: '🛠️ Bạn có toàn quyền quản lý hệ thống Bot Tân Dậu - Hỗ Trợ Chéo',
        features: [
            '👥 Quản lý người dùng',
            '💰 Quản lý thanh toán',
            '🛒 Quản lý tin đăng',
            '📊 Xem thống kê hệ thống'
        ],
        callToAction: 'Bạn muốn quản lý gì?'
    }
}

// Welcome service class
export class WelcomeService {
    private static instance: WelcomeService
    private welcomeCounts: Map<string, number> = new Map()
    private lastWelcomeTime: Map<string, number> = new Map()

    private constructor() { }

    public static getInstance(): WelcomeService {
        if (!WelcomeService.instance) {
            WelcomeService.instance = new WelcomeService()
        }
        return WelcomeService.instance
    }

    // Send welcome message based on user type
    public async sendWelcome(facebookId: string, userType: WelcomeType, context?: Record<string, any>): Promise<void> {
        try {
            // Check if welcome was already sent recently
            if (this.shouldSkipWelcome(facebookId)) {
                logger.debug(`Skipping welcome for user: ${facebookId} - already sent recently`)
                return
            }

            const template = WELCOME_TEMPLATES[userType]
            if (!template) {
                throw new Error(`Invalid welcome type: ${userType}`)
            }

            // Send typing indicator
            await sendTypingIndicator(facebookId)

            // Combine greeting and description into one message to reduce spam
            const combinedMessage = `${template.greeting}\n\n${template.description}`
            await sendMessage(facebookId, combinedMessage)

            // Send features as a single message with bullet points
            const featuresMessage = template.features.join('\n')
            await sendMessage(facebookId, featuresMessage)

            // Add delay between messages to prevent spam
            await this.delay(1000)

            // Send call to action with buttons
            await this.sendWelcomeButtons(facebookId, userType)

            // Track welcome
            this.trackWelcome(facebookId, userType)

            // Log welcome sent
            logUserAction(facebookId, 'welcome_sent', { userType, ...context })
            logBotEvent('welcome_sent', { userId: facebookId, userType })

        } catch (error) {
            const welcomeError = createUserError(
                `Failed to send welcome message: ${error instanceof Error ? error.message : String(error)}`,
                ErrorType.USER_ERROR,
                { facebookId, userType, ...context },
                facebookId
            )

            logger.error(`Welcome message failed for user: ${facebookId}`, { userType, ...context }, error as Error)
            throw errorHandler.handleError(welcomeError)
        }
    }

    // Send welcome buttons based on user type
    private async sendWelcomeButtons(facebookId: string, userType: WelcomeType): Promise<void> {
        const buttons = this.getWelcomeButtons(userType)

        if (buttons.length > 0) {
            await sendQuickReply(
                facebookId,
                WELCOME_TEMPLATES[userType].callToAction,
                buttons
            )
        }
    }

    // Get welcome buttons based on user type
    private getWelcomeButtons(userType: WelcomeType) {
        switch (userType) {
            case WelcomeType.NEW_USER:
                return [
                    createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
                ]

            case WelcomeType.RETURNING_USER:
                return [
                    createQuickReply('🛒 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('📝 ĐĂNG BÁN', 'LISTING'),
                    createQuickReply('📊 THỐNG KÊ', 'STATS'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
                ]

            case WelcomeType.PENDING_USER:
                return [
                    createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                    createQuickReply('👀 XEM TIN ĐĂNG', 'VIEW_LISTINGS'),
                    createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
                ]

            case WelcomeType.EXPIRED_USER:
                return [
                    createQuickReply('💳 GIA HẠN NGAY', 'PAYMENT'),
                    createQuickReply('📊 LỊCH SỬ GIAO DỊCH', 'PAYMENT_HISTORY'),
                    createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
                ]

            case WelcomeType.ADMIN:
                return [
                    // Admin functions moved to web dashboard
                ]

            default:
                return []
        }
    }

    // Check if welcome should be skipped
    private shouldSkipWelcome(facebookId: string): boolean {
        const lastTime = this.lastWelcomeTime.get(facebookId)
        if (!lastTime) return false

        const now = Date.now()
        const timeDiff = now - lastTime
        const cooldownPeriod = 30 * 60 * 1000 // 30 minutes to prevent spam

        return timeDiff < cooldownPeriod
    }

    // Track welcome message
    private trackWelcome(facebookId: string, userType: WelcomeType): void {
        const count = this.welcomeCounts.get(facebookId) || 0
        this.welcomeCounts.set(facebookId, count + 1)
        this.lastWelcomeTime.set(facebookId, Date.now())

        // Update user welcome count in database
        this.updateUserWelcomeCount(facebookId, count + 1)
    }

    // Update user welcome count in database
    private async updateUserWelcomeCount(facebookId: string, count: number): Promise<void> {
        try {
            await updateUser(facebookId, {
                welcome_interaction_count: count,
                last_welcome_sent: new Date().toISOString()
            })
        } catch (error) {
            logger.warn(`Failed to update welcome count for user: ${facebookId}`, { count })
        }
    }

    // Send personalized welcome based on user data
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

            // Determine user type
            const userType = this.determineUserType(userData)

            // Send personalized greeting
            await sendMessage(facebookId, `🎉 Chào mừng ${displayName} đến với Bot Tân Dậu - Hỗ Trợ Chéo!`)

            // Send welcome based on user type
            await this.sendWelcome(facebookId, userType, { displayName, userData })

        } catch (error) {
            logger.error(`Personalized welcome failed for user: ${facebookId}`, { userData }, error as Error)
            throw error
        }
    }

    // Determine user type from user data
    private determineUserType(userData: any): WelcomeType {
        if (!userData) return WelcomeType.NEW_USER

        // Check if admin
        if (userData.status === 'admin') return WelcomeType.ADMIN

        // Check if pending
        if (userData.status === 'pending') return WelcomeType.PENDING_USER

        // Check if expired
        if (userData.status === 'expired') return WelcomeType.EXPIRED_USER

        // Check if returning user
        if (userData.welcome_interaction_count && userData.welcome_interaction_count > 0) {
            return WelcomeType.RETURNING_USER
        }

        // Default to new user
        return WelcomeType.NEW_USER
    }

    // Send welcome for specific flow
    public async sendFlowWelcome(facebookId: string, flowType: string, context?: Record<string, any>): Promise<void> {
        try {
            const flowMessages = this.getFlowWelcomeMessages(flowType)

            for (const message of flowMessages) {
                await sendMessage(facebookId, message)
            }

            // Send flow-specific buttons
            const buttons = this.getFlowWelcomeButtons(flowType)
            if (buttons.length > 0) {
                await sendQuickReply(
                    facebookId,
                    'Bạn muốn tiếp tục với:',
                    buttons
                )
            }

            logUserAction(facebookId, 'flow_welcome_sent', { flowType, ...context })

        } catch (error) {
            logger.error(`Flow welcome failed for user: ${facebookId}`, { flowType, ...context }, error as Error)
            throw error
        }
    }

    // Get flow welcome messages
    private getFlowWelcomeMessages(flowType: string): string[] {
        switch (flowType) {
            case 'registration':
                return [
                    '📝 BẮT ĐẦU ĐĂNG KÝ THÀNH VIÊN',
                    'Để tham gia cộng đồng Tân Dậu - Hỗ Trợ Chéo, bạn cần cung cấp một số thông tin cơ bản.',
                    'Thông tin của bạn sẽ được bảo mật và chỉ sử dụng để kết nối trong cộng đồng.'
                ]

            case 'listing':
                return [
                    '🛒 BẮT ĐẦU NIÊM YẾT SẢN PHẨM',
                    'Hãy cung cấp thông tin chi tiết về sản phẩm bạn muốn bán.',
                    'Thông tin càng chi tiết, khả năng tìm được người mua càng cao.'
                ]

            case 'search':
                return [
                    '🔍 BẮT ĐẦU TÌM KIẾM SẢN PHẨM',
                    'Hãy mô tả sản phẩm bạn đang tìm kiếm.',
                    'Tôi sẽ giúp bạn tìm những tin đăng phù hợp nhất.'
                ]

            default:
                return ['Bắt đầu quy trình mới']
        }
    }

    // Get flow welcome buttons
    private getFlowWelcomeButtons(flowType: string) {
        switch (flowType) {
            case 'registration':
                return [
                    createQuickReply('✅ BẮT ĐẦU', 'START_REGISTRATION'),
                    createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                    createQuickReply('❌ HỦY', 'CANCEL')
                ]

            case 'listing':
                return [
                    createQuickReply('✅ BẮT ĐẦU', 'START_LISTING'),
                    createQuickReply('📋 XEM HƯỚNG DẪN', 'LISTING_GUIDE'),
                    createQuickReply('❌ HỦY', 'CANCEL')
                ]

            case 'search':
                return [
                    createQuickReply('✅ BẮT ĐẦU', 'START_SEARCH'),
                    createQuickReply('🔍 TÌM KIẾM NÂNG CAO', 'ADVANCED_SEARCH'),
                    createQuickReply('❌ HỦY', 'CANCEL')
                ]

            default:
                return []
        }
    }

    // Get welcome statistics
    public getWelcomeStats(): Record<string, any> {
        const stats: Record<string, any> = {}

        for (const [userId, count] of Array.from(this.welcomeCounts.entries())) {
            const lastTime = this.lastWelcomeTime.get(userId)
            stats[userId] = {
                count,
                lastWelcome: lastTime ? new Date(lastTime).toISOString() : null
            }
        }

        return stats
    }

    // Clear welcome statistics
    public clearWelcomeStats(): void {
        this.welcomeCounts.clear()
        this.lastWelcomeTime.clear()
    }

    // Helper method to add delay between messages
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Export singleton instance
export const welcomeService = WelcomeService.getInstance()

// Export convenience functions
export const sendWelcome = (facebookId: string, userType: WelcomeType, context?: Record<string, any>) =>
    welcomeService.sendWelcome(facebookId, userType, context)

export const sendPersonalizedWelcome = (facebookId: string, userData: any) =>
    welcomeService.sendPersonalizedWelcome(facebookId, userData)

export const sendFlowWelcome = (facebookId: string, flowType: string, context?: Record<string, any>) =>
    welcomeService.sendFlowWelcome(facebookId, flowType, context)

export const getWelcomeStats = () =>
    welcomeService.getWelcomeStats()

export const clearWelcomeStats = () =>
    welcomeService.clearWelcomeStats()

export default welcomeService
