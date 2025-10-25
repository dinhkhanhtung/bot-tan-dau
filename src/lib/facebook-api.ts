/**
 * Facebook API - Main Entry Point
 * Re-exports all Facebook API functionality from modular files
 * Maintains backward compatibility while providing better organization
 */

// Re-export messaging functions
export {
    sendMessage,
    sendTypingIndicator,
    sendTypingIndicatorInstant,
    sendMessagesWithTyping,
    sendImage,
    hideButtons
} from './facebook/facebook-messaging'

// Re-export template functions
export {
    sendQuickReply,
    sendGenericTemplate,
    sendButtonTemplate,
    sendListTemplate,
    sendCarouselTemplate,
    sendQuickReplyNoTyping
} from './facebook/facebook-templates'

// Re-export button creation helpers
export {
    createQuickReply,
    createPostbackButton,
    createURLButton,
    createGenericElement,
    createListElement,
    ButtonFactory,
    ButtonValidator
} from './facebook/facebook-buttons'

// Re-export rate limiter (for advanced usage)
export {
    facebookRateLimiter,
    FacebookRateLimiter
} from './facebook/facebook-rate-limiter'
