import { sendMessage, sendTypingIndicator, sendQuickReply, createQuickReply } from '../facebook-api'
import { SmartContextManager, UserContext, UserType, UserState } from './smart-context-manager'
import { UnifiedBotSystem } from './unified-entry-point'
import { updateBotSession, getBotSession } from '../utils'

// Flow Adapter - Cầu nối giữa hệ thống cũ và mới
export class FlowAdapter {

    /**
     * Adapter để tích hợp Smart Router vào bot-handlers hiện tại
     * Không làm break hệ thống cũ, chỉ thêm tính năng mới
     */
    static async adaptMessageHandling(user: any, text: string): Promise<boolean> {
        try {
            // Bước 1: Kiểm tra xem có nên sử dụng Smart Router không
            const shouldUseSmartRouter = await this.shouldUseSmartRouter(user, text)

            if (shouldUseSmartRouter) {
                // Bước 2: Sử dụng Smart Router
                await UnifiedBotSystem.handleMessage(user, text)
                return true // Đã xử lý bởi Smart Router
            }

            // Bước 3: Fallback về hệ thống cũ nếu cần
            return false // Chưa xử lý, để hệ thống cũ xử lý

        } catch (error) {
            console.error('Error in flow adapter:', error)
            return false // Fallback về hệ thống cũ
        }
    }

    /**
     * Adapter cho postback handling
     */
    static async adaptPostbackHandling(user: any, postback: string): Promise<boolean> {
        try {
            // Kiểm tra xem postback có phải từ Smart Router không
            if (this.isSmartRouterAction(postback)) {
                await UnifiedBotSystem.handleMessage(user, '', true, postback)
                return true
            }

            return false // Để hệ thống cũ xử lý

        } catch (error) {
            console.error('Error in postback adapter:', error)
            return false
        }
    }

    /**
     * Kiểm tra xem có nên sử dụng Smart Router không
     * Điều kiện: tin nhắn đầu tiên hoặc các từ khóa đặc biệt
     */
    private static async shouldUseSmartRouter(user: any, text: string): Promise<boolean> {
        // Luôn sử dụng Smart Router cho các trường hợp sau:
        // 1. Tin nhắn bắt đầu bằng "chào", "hi", "hello"
        // 2. Tin nhắn là "start", "menu", "home"
        // 3. Tin nhắn là các từ khóa phổ biến
        // 4. User mới hoàn toàn (chưa có session)

        const smartKeywords = [
            'chào', 'hi', 'hello', 'xin chào',
            'start', 'menu', 'home', 'trang chủ',
            'bắt đầu', 'khởi động', 'bắt đầu lại',
            'giúp tôi', 'hỗ trợ', 'tư vấn',
            'tôi muốn', 'tôi cần', 'bạn ơi'
        ]

        const lowerText = text.toLowerCase()

        // Kiểm tra từ khóa thông minh
        const hasSmartKeyword = smartKeywords.some(keyword => lowerText.includes(keyword))

        if (hasSmartKeyword) {
            return true
        }

        // Kiểm tra user mới hoàn toàn
        const context = await SmartContextManager.analyzeUserContext(user)
        if (context.userType === UserType.NEW_USER && context.userState === UserState.IDLE) {
            return true
        }

        // Kiểm tra session rỗng
        const session = await getBotSession(user.facebook_id)
        if (!session) {
            return true
        }

        return false
    }

    /**
     * Kiểm tra xem action có phải từ Smart Router không
     */
    private static isSmartRouterAction(action: string): boolean {
        const smartActions = [
            // Admin actions
            'ADMIN_PAYMENTS', 'ADMIN_USERS', 'ADMIN_LISTINGS', 'ADMIN_STATS',
            'ADMIN_NOTIFICATIONS', 'ADMIN_SETTINGS',
            // User actions
            'MAIN_MENU', 'LISTING', 'SEARCH', 'COMMUNITY', 'PAYMENT', 'POINTS', 'SETTINGS',
            // New user actions
            'REGISTER', 'INFO', 'SUPPORT',
            // Flow actions
            'CONTINUE_REGISTRATION', 'CANCEL_REGISTRATION',
            'CONTINUE_LISTING', 'CANCEL_LISTING',
            'CONTINUE_SEARCH', 'CANCEL_SEARCH'
        ]

        return smartActions.includes(action)
    }

    /**
     * Migrate từ hệ thống cũ sang Smart Router một cách an toàn
     */
    static async migrateToSmartRouter(user: any): Promise<void> {
        try {
            // Clear session cũ để bắt đầu fresh với Smart Router
            await updateBotSession(user.facebook_id, null)

            // Gửi welcome message từ Smart Router
            await UnifiedBotSystem.handleMessage(user, 'start')

        } catch (error) {
            console.error('Error migrating to Smart Router:', error)
            // DISABLED: Welcome message now handled by anti-spam system
            console.log('Welcome message handled by anti-spam system')
        }
    }

    /**
     * Fallback handler khi Smart Router gặp lỗi
     */
    static async handleFallback(user: any, error: any): Promise<void> {
        console.error('Smart Router error, falling back to legacy system:', error)

        try {
            // DISABLED: Welcome message now handled by anti-spam system
            console.log('Welcome message handled by anti-spam system')
        } catch (fallbackError) {
            console.error('Fallback handler also failed:', fallbackError)
        }
    }
}
