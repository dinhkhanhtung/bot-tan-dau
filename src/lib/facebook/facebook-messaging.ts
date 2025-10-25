/**
 * Facebook Messaging
 * Core messaging functions for Facebook API
 */

import axios from 'axios'
import { facebookRateLimiter } from './facebook-rate-limiter'

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0'

// Send text message with rate limiting
export async function sendMessage(recipientId: string, message: string) {
    // Validate message is not empty
    if (!message || message.trim() === '') {
        console.warn('Attempted to send empty message, skipping...')
        return null
    }

    // Apply rate limiting
    await facebookRateLimiter.applyRateLimit(recipientId)

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

// Hide/remove buttons by sending regular message (Facebook Messenger workaround)
export async function hideButtons(recipientId: string) {
    try {
        console.log('🔧 Attempting to hide buttons for user:', recipientId)

        // Method 1: Send a regular message without quick_replies to "push down" the buttons
        // Facebook API doesn't allow empty quick_replies array, so we only send regular message
        const response = await axios.post(
            `${FACEBOOK_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: {
                    text: '​' // Zero-width space character to make message invisible
                }
            },
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        )

        console.log('✅ Buttons hidden successfully for user:', recipientId, { response: response.data })
        return true
    } catch (error) {
        console.error('❌ Error hiding buttons for user:', recipientId, error)
        return false
    }
}
