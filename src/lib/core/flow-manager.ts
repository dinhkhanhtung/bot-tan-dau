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
                    await flow.handleStep(user, text, session)
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
                    await flow.handlePostback(user, payload, session)
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
        for (const [flowName, flow] of this.flows) {
            if (flow.canHandle(user, null)) {
                // Check if this is a trigger for this flow
                if (this.isFlowTrigger(flowName, lowerText)) {
                    console.log(`🚀 Triggering flow: ${flowName}`)
                    await flow.handleStep(user, text, null)
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
        // Check each flow for postback triggers
        for (const [flowName, flow] of this.flows) {
            if (flow.canHandle(user, null)) {
                // Check if this postback triggers this flow
                if (this.isPostbackTrigger(flowName, payload)) {
                    console.log(`🚀 Triggering flow via postback: ${flowName}`)
                    await flow.handlePostback(user, payload, null)
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
            'marketplace': ['đăng tin', 'bán hàng', 'marketplace'],
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
            'marketplace': ['LISTING', 'MARKETPLACE'],
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
        const { sendMessage } = await import('../facebook-api')
        await sendMessage(user.facebook_id, '👋 Xin chào! Tôi có thể giúp gì cho bạn?')
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
