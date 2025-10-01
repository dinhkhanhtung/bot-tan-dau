import axios from 'axios'

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0'

// Send text message
export async function sendMessage(recipientId: string, message: string) {
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
        throw error
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

// Send button template
export async function sendButtonTemplate(recipientId: string, text: string, buttons: any[]) {
    try {
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
                            buttons: buttons
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

// Send multiple messages with typing indicator
export async function sendMessagesWithTyping(recipientId: string, messages: string[]) {
    for (let i = 0; i < messages.length; i++) {
        // Send typing indicator
        await sendTypingIndicator(recipientId)

        // Wait 2-3 seconds
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))

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
