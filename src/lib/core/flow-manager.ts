import { BaseFlow, IFlow } from './flow-base'
import { SessionManager } from './session-manager'

/**
 * Centralized Flow Manager
 * Routes messages to appropriate flows and manages flow lifecycle
 */
export class FlowManager {
    private static flows: Map<string, IFlow> = new Map()

    /**
     * Register a flow
     */
    static registerFlow(flow: IFlow): void {
        this.flows.set(flow.flowName, flow)
        console.log(`✅ Flow registered: ${flow.flowName}`)
    }

    /**
     * Get all registered flows
     */
    static getFlows(): Map<string, IFlow> {
        return this.flows
    }

    /**
     * Get specific flow by name
     */
    static getFlow(flowName: string): IFlow | undefined {
        return this.flows.get(flowName)
    }

    /**
     * Handle incoming message
     */
    static async handleMessage(user: any, text: string): Promise<void> {
        try {
            console.log(`🔍 FlowManager handling message for user: ${user.facebook_id}`)

            // Get current session
            const session = await SessionManager.getSession(user.facebook_id)

            if (session) {
                // User has active session, route to appropriate flow
                const flow = this.flows.get(session.current_flow)
                if (flow && flow.canHandle(user, session)) {
                    console.log(`📤 Routing to flow: ${session.current_flow}`)
                    if (flow.handleMessage) {
                        await flow.handleMessage(user, text, session)
                    }
                    return
                }
            }

            // No active session or flow can't handle, check for flow triggers
            await this.handleFlowTriggers(user, text)

        } catch (error) {
            console.error('❌ FlowManager.handleMessage error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle postback events
     */
    static async handlePostback(user: any, payload: string): Promise<void> {
        try {
            console.log(`🔍 FlowManager handling postback for user: ${user.facebook_id}`)

            // Get current session
            const session = await SessionManager.getSession(user.facebook_id)

            if (session) {
                // User has active session, route to appropriate flow
                const flow = this.flows.get(session.current_flow)
                if (flow && flow.canHandle(user, session)) {
                    console.log(`📤 Routing postback to flow: ${session.current_flow}`)
                    if (flow.handlePostback) {
                        await flow.handlePostback(user, payload, session)
                    }
                    return
                }
            }

            // No active session, check for flow triggers
            await this.handlePostbackTriggers(user, payload)

        } catch (error) {
            console.error('❌ FlowManager.handlePostback error:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Handle flow triggers from text messages
     */
    private static async handleFlowTriggers(user: any, text: string): Promise<void> {
        const lowerText = text.toLowerCase().trim()

        // Check each flow for triggers
        for (const [flowName, flow] of Array.from(this.flows.entries())) {
            if (flow.canHandle(user, null)) {
                // Check if this is a trigger for this flow
                if (this.isFlowTrigger(flowName, lowerText)) {
                    console.log(`🚀 Triggering flow: ${flowName}`)
                    if (flow.handleMessage) {
                        await flow.handleMessage(user, text, null)
                    }
                    return
                }
            }
        }

        // No flow triggered, send default message
        await this.sendDefaultMessage(user)
    }

    /**
     * Handle postback triggers
     */
    private static async handlePostbackTriggers(user: any, payload: string): Promise<void> {
        // Handle special postbacks first
        if (payload === 'INFO' || payload === 'CONTACT_ADMIN') {
            await this.handleSpecialPostbacks(user, payload)
            return
        }

        // Check each flow for postback triggers
        for (const [flowName, flow] of Array.from(this.flows.entries())) {
            if (flow.canHandle(user, null)) {
                // Check if this postback triggers this flow
                if (this.isPostbackTrigger(flowName, payload)) {
                    console.log(`🚀 Triggering flow via postback: ${flowName}`)
                    if (flow.handlePostback) {
                        await flow.handlePostback(user, payload, null)
                    }
                    return
                }
            }
        }

        // No flow triggered, send default message
        await this.sendDefaultMessage(user)
    }

    /**
     * Check if text is a trigger for specific flow
     */
    private static isFlowTrigger(flowName: string, text: string): boolean {
        const triggers: { [key: string]: string[] } = {
            'registration': ['dkt', 'đăng ký', 'register'],
            'listing': ['đăng tin', 'bán hàng', 'listing'],
            'search': ['tìm kiếm', 'search', 'tìm'],
            'community': ['cộng đồng', 'community'],
            'payment': ['thanh toán', 'payment', 'nạp tiền']
        }

        const flowTriggers = triggers[flowName] || []
        return flowTriggers.some(trigger => text.includes(trigger))
    }

    /**
     * Check if postback is a trigger for specific flow
     */
    private static isPostbackTrigger(flowName: string, payload: string): boolean {
        const triggers: { [key: string]: string[] } = {
            'registration': ['REGISTER', 'DKT'],
            'listing': ['LISTING', 'LIST'],
            'search': ['SEARCH', 'FIND'],
            'community': ['COMMUNITY'],
            'payment': ['PAYMENT']
        }

        const flowTriggers = triggers[flowName] || []
        return flowTriggers.some(trigger => payload.includes(trigger))
    }

    /**
     * Send default message when no flow is triggered
     */
    private static async sendDefaultMessage(user: any): Promise<void> {
        // Use the original logic from unified-entry-point
        const { UnifiedBotSystem } = await import('./unified-entry-point')
        await UnifiedBotSystem.handleDefaultMessage(user)
    }

    /**
     * Handle special postbacks that don't trigger flows
     */
    private static async handleSpecialPostbacks(user: any, payload: string): Promise<void> {
        switch (payload) {
            case 'INFO':
                await this.sendDetailedInfo(user)
                break
            case 'CONTACT_ADMIN':
                await this.contactAdmin(user)
                break
            default:
                // Not a special postback, continue with normal flow
                return
        }
    }

    /**
     * Send detailed information about the bot
     */
    private static async sendDetailedInfo(user: any): Promise<void> {
        try {
            const { sendMessage } = await import('../facebook-api')

            // Send detailed information in 2 compact messages
            const infoMessage = `📋 THÔNG TIN CHI TIẾT BOT TÂN DẬU

Kết nối với hơn 2 triệu Tân Dậu để cùng nhau phát triển và thịnh vượng.

🎯 TÍNH NĂNG CHÍNH:
🛒 Tìm kiếm & niêm yết sản phẩm
💬 Kết nối với cộng đồng
📊 Thống kê & báo cáo
🎁 Điểm thưởng & quà tặng`

            const processMessage = `📋 QUY TRÌNH ĐĂNG KÝ:
1️⃣ Họ tên đầy đủ
2️⃣ Số điện thoại
3️⃣ Tỉnh/thành phố
4️⃣ Xác nhận sinh năm 1981

💡 LƯU Ý QUAN TRỌNG:
• Chỉ dành cho Tân Dậu (1981)
• Thông tin được bảo mật tuyệt đối
• Hỗ trợ 24/7 từ admin

Bạn có muốn đăng ký ngay không?`

            await sendMessage(user.facebook_id, infoMessage)
            await this.delay(1000)
            await sendMessage(user.facebook_id, processMessage)
            await this.delay(1000)

            // Send action buttons
            const { sendQuickReply, createQuickReply } = await import('../facebook-api')
            await sendQuickReply(user.facebook_id, 'Bạn muốn làm gì tiếp theo?', [
                createQuickReply('🚀 ĐĂNG KÝ NGAY', 'REGISTER'),
                createQuickReply('🛒 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
            ])

        } catch (error) {
            console.error('Error sending detailed info:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Contact admin - Bot stops and hides buttons
     */
    private static async contactAdmin(user: any): Promise<void> {
        try {
            const { sendMessage, hideButtons } = await import('../facebook-api')

            // Send contact information
            await sendMessage(user.facebook_id, '💬 THÔNG TIN LIÊN HỆ:\n\n📧 Email: dinhkhanhtung@outlook.com\n📱 SĐT: 0982581222\n\nCảm ơn bạn đã quan tâm!')

            // Hide buttons
            const hideResult = await hideButtons(user.facebook_id)
            console.log('🔧 Hidden buttons after contact request:', hideResult)

            // Stop bot for this user
            const { UserInteractionService } = await import('../user-interaction-service')
            await UserInteractionService.updateUserState(user.facebook_id, {
                bot_active: false
            })

            // Notify admin (you can add admin notification logic here)
            console.log('User requested support:', user.facebook_id)

        } catch (error) {
            console.error('Error contacting admin:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Delay helper for smooth message flow
     */
    private static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Send error message
     */
    private static async sendErrorMessage(facebookId: string): Promise<void> {
        const { sendMessage } = await import('../facebook-api')
        await sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }

    /**
     * Clear all flows (for testing)
     */
    static clearFlows(): void {
        this.flows.clear()
        console.log('🧹 All flows cleared')
    }
}
