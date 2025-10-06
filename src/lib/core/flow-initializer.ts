import { FlowManager } from './flow-manager'
import { RegistrationFlow } from '../flows/auth'

/**
 * Initialize all flows in the system
 * This should be called once at application startup
 */
export class FlowInitializer {
    /**
     * Initialize all flows
     */
    static initialize(): void {
        console.log('🚀 Initializing flows...')

        // Register all flows
        this.registerAuthFlows()
        // this.registerMarketplaceFlows() // TODO: Implement
        // this.registerCommunityFlows()   // TODO: Implement
        // this.registerPaymentFlows()     // TODO: Implement

        console.log('✅ All flows initialized successfully')
    }

    /**
     * Register authentication flows
     */
    private static registerAuthFlows(): void {
        const registrationFlow = new RegistrationFlow()
        FlowManager.registerFlow(registrationFlow)
    }

    /**
     * Register marketplace flows (TODO)
     */
    private static registerMarketplaceFlows(): void {
        // TODO: Implement marketplace flows
        console.log('📝 TODO: Register marketplace flows')
    }

    /**
     * Register community flows (TODO)
     */
    private static registerCommunityFlows(): void {
        // TODO: Implement community flows
        console.log('📝 TODO: Register community flows')
    }

    /**
     * Register payment flows (TODO)
     */
    private static registerPaymentFlows(): void {
        // TODO: Implement payment flows
        console.log('📝 TODO: Register payment flows')
    }
}
