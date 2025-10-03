// DEPRECATED: This file is replaced by UnifiedBotSystem
// All message handling is now centralized in src/lib/core/unified-entry-point.ts

import { sendMessage } from './facebook-api'

// DEPRECATED: Main message handler - DISABLED TO PREVENT CONFLICTS
export async function handleMessage(user: any, text: string) {
    console.log('⚠️ DEPRECATED: handleMessage called, redirecting to UnifiedBotSystem')

    // Redirect to UnifiedBotSystem to prevent conflicts
    const { UnifiedBotSystem } = await import('./core/unified-entry-point')
    await UnifiedBotSystem.handleMessage(user, text, false, '')
}

// DEPRECATED: Postback handler - DISABLED TO PREVENT CONFLICTS
export async function handlePostback(user: any, postback: string) {
    console.log('⚠️ DEPRECATED: handlePostback called, redirecting to UnifiedBotSystem')

    // Redirect to UnifiedBotSystem to prevent conflicts
    const { UnifiedBotSystem } = await import('./core/unified-entry-point')
    await UnifiedBotSystem.handleMessage(user, '', true, postback)
}

// Export specific functions to avoid conflicts
export {
    handleAdminCommand
} from './handlers/admin-handlers'

export {
    handleRegistration,
    handleRegistrationStep,
    handleDefaultMessage,
    handleSmartTrialNotification,
    handleInfo
} from './handlers/auth-handlers'

// Re-export from other handlers as needed
export * from './handlers/marketplace-handlers'
export * from './handlers/payment-handlers'
export * from './handlers/utility-handlers'
