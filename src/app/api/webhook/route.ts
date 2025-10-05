import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { CONFIG } from '@/lib/config'
import { logger, logSystemEvent, logError } from '@/lib/logger'
import { errorHandler, createApiError, ErrorType } from '@/lib/error-handler'
import { UnifiedBotSystem } from '@/lib/core/unified-entry-point'

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', CONFIG.BOT.APP_SECRET)
        .update(payload)
        .digest('hex')

    return signature === `sha256=${expectedSignature}`
}

// Webhook endpoint for Facebook Messenger Bot

// Handle GET request (webhook verification)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const mode = searchParams.get('hub.mode')
        const token = searchParams.get('hub.verify_token')
        const challenge = searchParams.get('hub.challenge')

        if (mode === 'subscribe' && token === CONFIG.BOT.VERIFY_TOKEN) {
            logSystemEvent('webhook_verified', { mode, challenge })
            return new NextResponse(challenge, { status: 200 })
        }

        logSystemEvent('webhook_verification_failed', { mode, token })
        return new NextResponse('Forbidden', { status: 403 })
    } catch (error) {
        logError(error as Error, { operation: 'webhook_verification' })
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

// Handle POST request (webhook events)
export async function POST(request: NextRequest) {
    const startTime = Date.now()

    try {
        const body = await request.text()
        const signature = request.headers.get('x-hub-signature-256')

        logSystemEvent('webhook_received', {
            bodyLength: body.length,
            hasSignature: !!signature
        })

        // Verify signature
        if (signature && !verifySignature(body, signature)) {
            logSystemEvent('webhook_invalid_signature', { signature })
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const data = JSON.parse(body)

        // Handle different types of webhook events
        if (data.object === 'page') {
            for (const entry of data.entry) {
                for (const event of entry.messaging) {
                    await handleWebhookEvent(event)
                }
            }
        }

        const duration = Date.now() - startTime
        logSystemEvent('webhook_processed', { duration, eventCount: data.entry?.length || 0 })

        return new NextResponse('OK', { status: 200 })
    } catch (error) {
        const duration = Date.now() - startTime
        const webhookError = createApiError(
            `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorType.WEBHOOK_ERROR,
            { duration }
        )

        logError(webhookError, { operation: 'webhook_processing', duration })
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

// Handle webhook events
async function handleWebhookEvent(event: any) {
    try {
        const senderId = event.sender?.id
        const recipientId = event.recipient?.id

        logger.info('Processing webhook event', {
            senderId,
            recipientId,
            hasMessage: !!event.message,
            hasPostback: !!event.postback,
            eventType: event.message ? 'message' : event.postback ? 'postback' : 'other'
        })

        // Check if bot is stopped
        const { getBotStatus } = await import('@/lib/database-service')
        const botStatus = await getBotStatus()

        if (botStatus === 'stopped') {
            logSystemEvent('bot_stopped_ignoring_event', { eventType: event.message ? 'message' : 'postback' })
            return
        }

        // Handle message events
        if (event.message) {
            await handleMessageEvent(event)
        }
        // Handle postback events (button clicks)
        else if (event.postback) {
            await handlePostbackEvent(event)
        }
        // Handle delivery confirmations
        else if (event.delivery) {
            logSystemEvent('message_delivered', { delivery: event.delivery })
        }
        // Handle read confirmations
        else if (event.read) {
            logSystemEvent('message_read', { read: event.read })
        }
    } catch (error) {
        const eventError = createApiError(
            `Webhook event handling failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorType.WEBHOOK_ERROR,
            { event }
        )

        logError(eventError, { operation: 'webhook_event_handling', event })
    }
}

// Handle message events
async function handleMessageEvent(event: any) {
    try {
        const senderId = event.sender.id
        const message = event.message

        // Tin nhắn từ fanpage = admin, không skip
        // if (senderId === CONFIG.BOT.APP_ID) {
        //     return
        // }

        // Check for duplicate message processing
        const messageId = message.mid || `${senderId}_${Date.now()}`
        if (processedMessages.has(messageId)) {
            logSystemEvent('duplicate_message_ignored', { messageId, senderId })
            return
        }
        processedMessages.add(messageId)

        // Clean up old entries (keep only last 1000)
        if (processedMessages.size > 1000) {
            const entries = Array.from(processedMessages)
            processedMessages.clear()
            entries.slice(-500).forEach(entry => processedMessages.add(entry))
        }

        // Get user data
        const { getUserByFacebookId } = await import('@/lib/database-service')
        const user = await getUserByFacebookId(senderId)

        // Create user object for UnifiedBotSystem - ENSURE CORRECT FACEBOOK_ID
        const userObj = user || {
            facebook_id: senderId,
            status: 'new_user',
            name: null,
            phone: null,
            membership_expires_at: null
        }

        // Log user info for debugging
        logger.info('User object created for webhook', {
            senderId,
            userObj_facebook_id: userObj.facebook_id,
            user_status: userObj.status,
            has_user_data: !!user
        })

        // Log message
        const { logMessage } = await import('@/lib/database-service')
        await logMessage(senderId, message.text || '', message.mid || '')

        // Handle different message types
        if (message.text) {
            // Check if it's a quick reply first
            if (message.quick_reply && message.quick_reply.payload) {
                logger.info(`Handling Quick Reply: ${message.quick_reply.payload}`, { senderId })
                await UnifiedBotSystem.handleMessage(userObj, '', true, message.quick_reply.payload)
            } else {
                // Handle regular text message
                logger.info(`Handling text message: ${message.text}`, { senderId })
                await UnifiedBotSystem.handleMessage(userObj, message.text)
            }
        } else if (message.attachments && message.attachments.length > 0) {
            logger.info(`Handling attachment message: ${message.attachments.length} attachments`, { senderId })
            await UnifiedBotSystem.handleMessage(userObj, 'attachment')
        } else if (message.sticker_id) {
            logger.info(`Handling sticker message`, { senderId })
            await UnifiedBotSystem.handleMessage(userObj, 'sticker')
        } else if (message.reaction || message.reactions) {
            logger.info(`Handling reaction message`, { senderId })
            // Skip reaction messages
            return
        } else {
            // Handle other message types or empty messages
            logger.info(`Handling other message type`, { senderId })
            await UnifiedBotSystem.handleMessage(userObj, 'other')
        }

    } catch (error) {
        const messageError = createApiError(
            `Message handling failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorType.WEBHOOK_ERROR,
            { event }
        )

        logError(messageError, { operation: 'message_handling', event })
    }
}

// Cache to prevent duplicate postback processing
const processedPostbacks = new Set<string>()
const processedMessages = new Set<string>()

// Handle postback events (button clicks)
async function handlePostbackEvent(event: any) {
    try {
        const senderId = event.sender.id
        const payload = event.postback.payload
        const messageId = event.postback.mid || `${senderId}_${payload}_${Date.now()}`

        logger.info(`Processing postback event`, {
            senderId,
            payload,
            messageId,
            timestamp: Date.now()
        })

        // Check if this postback was already processed
        if (processedPostbacks.has(messageId)) {
            logger.warn('Duplicate postback ignored', { messageId, senderId, payload })
            return
        }

        // Mark as processed
        processedPostbacks.add(messageId)

        // Clean up old entries (keep only last 1000)
        if (processedPostbacks.size > 1000) {
            const entries = Array.from(processedPostbacks)
            processedPostbacks.clear()
            entries.slice(-500).forEach(entry => processedPostbacks.add(entry))
        }

        // Get user data
        const { getUserByFacebookId } = await import('@/lib/database-service')
        const user = await getUserByFacebookId(senderId)

        // Create user object for UnifiedBotSystem
        const userObj = user || {
            facebook_id: senderId,
            status: 'new_user',
            name: null,
            phone: null,
            membership_expires_at: null
        }

        logger.info(`Handling postback: ${payload}`, {
            senderId,
            userObj_facebook_id: userObj.facebook_id,
            user_status: userObj.status
        })

        // Handle postback via UnifiedBotSystem
        await UnifiedBotSystem.handleMessage(userObj, '', true, payload)

    } catch (error) {
        const postbackError = createApiError(
            `Postback handling failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorType.WEBHOOK_ERROR,
            { event }
        )

        logError(postbackError, { operation: 'postback_handling', event })
    }
}
