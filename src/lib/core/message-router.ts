import { sendMessage } from '../facebook-api'

// Import UnifiedBotSystem để sử dụng thay thế logic phức tạp
import { UnifiedBotSystem } from './unified-entry-point'

export interface MessageContext {
    user: any
    text: string
    isPostback?: boolean
    postback?: string
    session?: any
}

export class MessageRouter {
    constructor() {
        // MessageRouter hiện tại chỉ là thin wrapper để tương thích ngược
        // Tất cả logic phức tạp đã được chuyển vào UnifiedBotSystem
    }

    /**
     * Main message routing logic - DELEGATE TO UnifiedBotSystem
     */
    async routeMessage(context: MessageContext): Promise<void> {
        const { user, text, isPostback = false, postback = '' } = context

        try {
            // Validate user
            if (!user || !user.facebook_id) {
                console.error('Invalid user in message routing:', user)
                return
            }

            // Delegate to UnifiedBotSystem for all message processing
            await UnifiedBotSystem.handleMessage(user, text || '', isPostback, postback)

        } catch (error) {
            console.error('Error in message routing:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Send error message
     */
    private async sendErrorMessage(facebookId: string): Promise<void> {
        await sendMessage(facebookId, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
    }
}

// Export singleton instance
export const messageRouter = new MessageRouter()
