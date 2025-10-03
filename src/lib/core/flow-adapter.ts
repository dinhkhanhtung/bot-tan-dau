import { messageRouter, MessageContext } from './message-router'
import { handleMessage as oldHandleMessage, handlePostback as oldHandlePostback } from '../bot-handlers'

/**
 * Flow Adapter - Tích hợp hệ thống mới với hệ thống cũ
 * Cho phép chuyển đổi dần dần mà không làm mất chức năng
 */
export class FlowAdapter {
    private useNewSystem: boolean = false
    private fallbackToOld: boolean = true

    constructor(useNewSystem: boolean = false) {
        this.useNewSystem = useNewSystem
    }

    /**
     * Enable new system
     */
    enableNewSystem(): void {
        this.useNewSystem = true
        console.log('✅ New flow system enabled')
    }

    /**
     * Disable fallback to old system
     */
    disableFallback(): void {
        this.fallbackToOld = false
        console.log('⚠️ Fallback to old system disabled')
    }

    /**
     * Handle message with smart routing
     */
    async handleMessage(user: any, text: string): Promise<void> {
        try {
            if (this.useNewSystem) {
                // Use new system
                const context: MessageContext = {
                    user,
                    text,
                    isPostback: false,
                    session: null // Will be fetched inside router
                }

                await messageRouter.routeMessage(context)
            } else {
                // Use old system
                await oldHandleMessage(user, text)
            }
        } catch (error) {
            console.error('Error in new message handler:', error)

            if (this.fallbackToOld) {
                console.log('🔄 Falling back to old system...')
                try {
                    await oldHandleMessage(user, text)
                } catch (fallbackError) {
                    console.error('Error in fallback system:', fallbackError)
                }
            }
        }
    }

    /**
     * Handle postback with smart routing
     */
    async handlePostback(user: any, postback: string): Promise<void> {
        try {
            if (this.useNewSystem) {
                // Use new system
                const context: MessageContext = {
                    user,
                    text: '',
                    isPostback: true,
                    postback,
                    session: null // Will be fetched inside router
                }

                await messageRouter.routeMessage(context)
            } else {
                // Use old system
                await oldHandlePostback(user, postback)
            }
        } catch (error) {
            console.error('Error in new postback handler:', error)

            if (this.fallbackToOld) {
                console.log('🔄 Falling back to old system...')
                try {
                    await oldHandlePostback(user, postback)
                } catch (fallbackError) {
                    console.error('Error in fallback system:', fallbackError)
                }
            }
        }
    }

    /**
     * Get system status
     */
    getStatus(): { newSystem: boolean, fallback: boolean } {
        return {
            newSystem: this.useNewSystem,
            fallback: this.fallbackToOld
        }
    }

    /**
     * Test new system with sample data
     */
    async testNewSystem(user: any, text: string): Promise<boolean> {
        try {
            const context: MessageContext = {
                user,
                text,
                isPostback: false,
                session: null
            }

            await messageRouter.routeMessage(context)
            return true
        } catch (error) {
            console.error('Test failed:', error)
            return false
        }
    }
}

// Export singleton instance
export const flowAdapter = new FlowAdapter()

// Export functions for easy integration
export async function handleMessage(user: any, text: string): Promise<void> {
    await flowAdapter.handleMessage(user, text)
}

export async function handlePostback(user: any, postback: string): Promise<void> {
    await flowAdapter.handlePostback(user, postback)
}
