import { sendMessage } from '../facebook-api'

/**
 * Base interface for all flows
 */
export interface IFlow {
    readonly flowName: string
    handleStep(user: any, input: string, session: any): Promise<void>
    handlePostback(user: any, payload: string, session: any): Promise<void>
    canHandle(user: any, session: any): boolean
}

/**
 * Base class for all flows with common functionality
 */
export abstract class BaseFlow implements IFlow {
    abstract readonly flowName: string

    /**
     * Abstract methods that must be implemented by subclasses
     */
    abstract handleStep(user: any, input: string, session: any): Promise<void>
    abstract handlePostback(user: any, payload: string, session: any): Promise<void>
    abstract canHandle(user: any, session: any): boolean

    /**
     * Common error handling
     */
    protected async handleError(user: any, error: any, context: string): Promise<void> {
        console.error(`❌ Error in ${this.flowName} - ${context}:`, error)
        await this.sendErrorMessage(user.facebook_id)
    }

    /**
     * Send error message to user
     */
    protected async sendErrorMessage(facebookId: string): Promise<void> {
        await sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    }

    /**
     * Validate user input
     */
    protected validateInput(input: string, minLength: number = 1): boolean {
        return input && input.trim().length >= minLength
    }

    /**
     * Log flow activity
     */
    protected logActivity(user: any, action: string, data?: any): void {
        console.log(`[${this.flowName}] ${action} for user: ${user.facebook_id}`, data || '')
    }
}
