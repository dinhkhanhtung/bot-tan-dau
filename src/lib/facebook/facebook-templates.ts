/**
 * Facebook Templates
 * Template creation and sending functions for Facebook API
 */

import axios from 'axios'

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0'

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

// Send quick reply without typing indicator for better UX
export async function sendQuickReplyNoTyping(recipientId: string, text: string, quickReplies: any[]) {
    const messageData = {
        recipient: { id: recipientId },
        message: {
            text: text,
            quick_replies: quickReplies
        }
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Quick reply error:', errorData)
            throw new Error(`Quick reply failed: ${errorData.error?.message || 'Unknown error'}`)
        }

        console.log('Quick reply sent successfully')
    } catch (error) {
        console.error('Error sending quick reply:', error)
        throw error
    }
}
