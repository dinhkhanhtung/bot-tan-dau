import { FlowManager } from './flow-manager'
import { RegistrationFlow } from '../flows/auth/registration-flow'
import { ListingFlow, SearchFlow } from '../flows/marketplace'
import { CommunityFlow } from '../flows/community'

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
        this.registerMarketplaceFlows()
        this.registerCommunityFlows()
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
     * Register marketplace flows
     */
    private static registerMarketplaceFlows(): void {
        const listingFlow = new ListingFlow()
        const searchFlow = new SearchFlow()
        FlowManager.registerFlow(listingFlow)
        FlowManager.registerFlow(searchFlow)
    }

    /**
     * Register community flows
     */
    private static registerCommunityFlows(): void {
        const communityFlow = new CommunityFlow()
        FlowManager.registerFlow(communityFlow)
    }

    /**
     * Register payment flows (TODO)
     */
    private static registerPaymentFlows(): void {
        // TODO: Implement payment flows
        console.log('📝 TODO: Register payment flows')
    }
}
