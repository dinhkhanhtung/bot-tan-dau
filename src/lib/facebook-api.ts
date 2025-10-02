import axios from 'axios'

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0'

// Send text message
export async function sendMessage(recipientId: string, message: string) {
    // Validate message is not empty
    if (!message || message.trim() === '') {
        console.warn('Attempted to send empty message, skipping...')
        return null
    }

    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: { text: message }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        console.log('Message sent successfully:', response.data)
        return response.data
    } catch (error) {
        console.error('Error sending message:', error)
        throw error
    }
}

// Send typing indicator
export async function sendTypingIndicator(recipientId: string) {
    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                sender_action: 'typing_on'
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending typing indicator:', error)
        // Don't throw error for typing indicator to avoid breaking main flow
        return null
    }
}

// Send typing indicator immediately (fire and forget for faster response)
export function sendTypingIndicatorInstant(recipientId: string) {
    try {
        axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                sender_action: 'typing_on'
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        ).catch(err => console.error('Typing indicator error:', err))
    } catch (error) {
        console.error('Error sending instant typing indicator:', error)
    }
}

// Send quick reply buttons
export async function sendQuickReply(recipientId: string, text: string, quickReplies: any[]) {
    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    text: text,
                    quick_replies: quickReplies
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending quick reply:', error)
        throw error
    }
}

// Send generic template (for product listings)
export async function sendGenericTemplate(recipientId: string, elements: any[]) {
    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: elements
                        }
                    }
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending generic template:', error)
        throw error
    }
}

// Send button template - FIXED: Limit buttons to 3 max to avoid "too many elements" error
export async function sendButtonTemplate(recipientId: string, text: string, buttons: any[]) {
    try {
        // Facebook allows maximum 3 buttons per template
        const maxButtons = 3
        const limitedButtons = buttons.slice(0, maxButtons)

        if (buttons.length > maxButtons) {
            console.warn(`Button template limited to ${maxButtons} buttons. Original had ${buttons.length} buttons.`)
        }

        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: text,
                            buttons: limitedButtons
                        }
                    }
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending button template:', error)
        throw error
    }
}

// Send list template
export async function sendListTemplate(recipientId: string, elements: any[], buttons?: any[]) {
    try {
        const payload: any = {
            template_type: 'list',
            elements: elements
        }

        if (buttons) {
            payload.buttons = buttons
        }

        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: payload
                    }
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending list template:', error)
        throw error
    }
}

// Send carousel template
export async function sendCarouselTemplate(recipientId: string, elements: any[]) {
    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: elements
                        }
                    }
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending carousel template:', error)
        throw error
    }
}

// Send image
export async function sendImage(recipientId: string, imageUrl: string) {
    try {
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    attachment: {
                        type: 'image',
                        payload: {
                            url: imageUrl
                        }
                    }
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        return response.data
    } catch (error) {
        console.error('Error sending image:', error)
        throw error
    }
}

// Hide/remove buttons by sending empty quick reply (Facebook Messenger hack)
export async function hideButtons(recipientId: string) {
    try {
        // Send empty quick reply to clear previous buttons
        // This is a workaround since Facebook doesn't provide a direct way to hide buttons
        await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    text: '​', // Zero-width space character
                    quick_replies: []
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )
        return true
    } catch (error) {
        console.error('Error hiding buttons:', error)
        return false
    }
}

// Send multiple messages with typing indicator - OPTIMIZED for faster response
export async function sendMessagesWithTyping(recipientId: string, messages: string[]) {
    for (let i = 0; i < messages.length; i++) {
        // Skip empty messages
        if (!messages[i] || messages[i].trim() === '') {
            console.warn(`Skipping empty message at index ${i}`)
            continue
        }

        // Send typing indicator (don't await to speed up)
        sendTypingIndicator(recipientId).catch(err => console.error('Typing indicator error:', err))

        // Wait 1-1.5 seconds (reduced from 2-3 seconds)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500))

        // Send message
        await sendMessage(recipientId, messages[i])
    }
}

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
