/**
 * Facebook Buttons
 * Button creation helpers for Facebook API
 */

// Helper function to create quick reply buttons
export function createQuickReply(text: string, payload: string) {
    return {
        content_type: 'text',
        title: text,
        payload: payload
    }
}

// Helper function to create postback buttons
export function createPostbackButton(title: string, payload: string) {
    return {
        type: 'postback',
        title: title,
        payload: payload
    }
}

// Helper function to create URL buttons
export function createURLButton(title: string, url: string) {
    return {
        type: 'web_url',
        title: title,
        url: url
    }
}

// Helper function to create generic template element
export function createGenericElement(
    title: string,
    subtitle: string,
    imageUrl?: string,
    buttons?: any[]
) {
    const element: any = {
        title: title,
        subtitle: subtitle
    }

    if (imageUrl) {
        element.image_url = imageUrl
    }

    if (buttons) {
        element.buttons = buttons
    }

    return element
}

// Helper function to create list element
export function createListElement(
    title: string,
    subtitle: string,
    imageUrl?: string,
    buttons?: any[]
) {
    const element: any = {
        title: title,
        subtitle: subtitle
    }

    if (imageUrl) {
        element.image_url = imageUrl
    }

    if (buttons) {
        element.buttons = buttons
    }

    return element
}

// Button factory for common button types
export class ButtonFactory {
    /**
     * Create navigation buttons
     */
    static createNavigationButtons(prevPayload?: string, nextPayload?: string): any[] {
        const buttons = []

        if (prevPayload) {
            buttons.push(createQuickReply('◀️ Quay lại', prevPayload))
        }

        if (nextPayload) {
            buttons.push(createQuickReply('▶️ Xem thêm', nextPayload))
        }

        return buttons
    }

    /**
     * Create action buttons
     */
    static createActionButtons(actions: Array<{ title: string, payload: string }>): any[] {
        return actions.map(action => createQuickReply(action.title, action.payload))
    }

    /**
     * Create contact buttons
     */
    static createContactButtons(phoneNumber: string, sellerId: string): any[] {
        return [
            createPostbackButton('💬 Liên hệ người bán', `CONTACT_SELLER_${sellerId}`)
        ]
    }

    /**
     * Create listing action buttons
     */
    static createListingButtons(listingId: string, sellerId: string): any[] {
        return [
            createPostbackButton('👁️ Xem chi tiết', `VIEW_LISTING_${listingId}`),
            createPostbackButton('💬 Liên hệ người bán', `CONTACT_SELLER_${sellerId}`)
        ]
    }

    /**
     * Create menu buttons
     */
    static createMenuButtons(options: Array<{ title: string, payload: string }>): any[] {
        return options.map(option => createQuickReply(option.title, option.payload))
    }

    /**
     * Create confirmation buttons
     */
    static createConfirmationButtons(confirmPayload: string, cancelPayload: string): any[] {
        return [
            createQuickReply('✅ Xác nhận', confirmPayload),
            createQuickReply('❌ Hủy', cancelPayload)
        ]
    }
}

// Button validation utilities
export class ButtonValidator {
    /**
     * Validate quick reply buttons
     */
    static validateQuickReplies(quickReplies: any[]): { isValid: boolean, errors: string[] } {
        const errors: string[] = []

        if (!Array.isArray(quickReplies)) {
            errors.push('Quick replies must be an array')
            return { isValid: false, errors }
        }

        if (quickReplies.length > 13) {
            errors.push('Maximum 13 quick reply buttons allowed')
        }

        quickReplies.forEach((reply, index) => {
            if (!reply.title || !reply.payload) {
                errors.push(`Quick reply at index ${index} missing title or payload`)
            }

            if (reply.title && reply.title.length > 20) {
                errors.push(`Quick reply title at index ${index} too long (max 20 characters)`)
            }
        })

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Validate template buttons
     */
    static validateTemplateButtons(buttons: any[]): { isValid: boolean, errors: string[] } {
        const errors: string[] = []

        if (!Array.isArray(buttons)) {
            errors.push('Buttons must be an array')
            return { isValid: false, errors }
        }

        if (buttons.length > 3) {
            errors.push('Maximum 3 buttons allowed per template')
        }

        buttons.forEach((button, index) => {
            if (!button.title || !button.type) {
                errors.push(`Button at index ${index} missing title or type`)
            }
        })

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}
