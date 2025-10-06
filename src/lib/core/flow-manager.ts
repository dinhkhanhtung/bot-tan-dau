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
            
            // Send detailed information with smooth flow
            await sendMessage(user.facebook_id, '📋 THÔNG TIN CHI TIẾT BOT TÂN DẬU')
            await this.delay(1500)
            
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '📋 QUY TRÌNH ĐĂNG KÝ:')
            await sendMessage(user.facebook_id, '1️⃣ Họ tên đầy đủ')
            await sendMessage(user.facebook_id, '2️⃣ Số điện thoại')
            await sendMessage(user.facebook_id, '3️⃣ Tỉnh/thành phố')
            await sendMessage(user.facebook_id, '4️⃣ Xác nhận sinh năm 1981')
            await this.delay(1500)
            
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '💡 LƯU Ý QUAN TRỌNG:')
            await sendMessage(user.facebook_id, '• Chỉ dành cho Tân Dậu (1981)')
            await sendMessage(user.facebook_id, '• Thông tin được bảo mật tuyệt đối')
            await sendMessage(user.facebook_id, '• Hỗ trợ 24/7 từ admin')
            await this.delay(1500)
            
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, '🎯 TÍNH NĂNG CHÍNH:')
            await sendMessage(user.facebook_id, '• 🛒 Tìm kiếm và niêm yết sản phẩm')
            await sendMessage(user.facebook_id, '• 💬 Kết nối với người dùng khác')
            await sendMessage(user.facebook_id, '• 📊 Xem thống kê và báo cáo')
            await sendMessage(user.facebook_id, '• 🎁 Nhận điểm thưởng và quà tặng')
            await this.delay(1500)
            
            await sendMessage(user.facebook_id, '━━━━━━━━━━━━━━━━━━━━')
            await sendMessage(user.facebook_id, 'Bạn có muốn đăng ký ngay không?')
            
            // Send action buttons
            const { sendQuickReply, createQuickReply } = await import('../facebook-api')
            await sendQuickReply(user.facebook_id, 'Chọn hành động:', [
                createQuickReply('🚀 ĐĂNG KÝ NGAY', 'REGISTER'),
                createQuickReply('💬 HỖ TRỢ', 'CONTACT_ADMIN')
            ])
            
        } catch (error) {
            console.error('Error sending detailed info:', error)
            await this.sendErrorMessage(user.facebook_id)
        }
    }

    /**
     * Contact admin
     */
    private static async contactAdmin(user: any): Promise<void> {
        try {
            const { sendMessage } = await import('../facebook-api')
            await sendMessage(user.facebook_id, '💬 Bạn đã yêu cầu hỗ trợ từ admin. Admin sẽ liên hệ với bạn sớm nhất có thể!')
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
