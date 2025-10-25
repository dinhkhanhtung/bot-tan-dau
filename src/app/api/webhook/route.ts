import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { CONFIG } from '@/lib/config'
import { logger, logSystemEvent, logError } from '@/lib/logger'
import { errorHandler, createApiError, ErrorType } from '@/lib/error-handler'
import { UnifiedBotSystem } from '@/lib/core/unified-entry-point'
import { AdminTakeoverService } from '@/lib/admin-takeover-service'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// Initialize bot system once
let systemInitialized = false

// Track processed messages to avoid duplicates
const processedMessages = new Set<string>()

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
        // Initialize bot system if not already done
        if (!systemInitialized) {
            UnifiedBotSystem.initialize()
            systemInitialized = true
        }

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

        // Check if this is an admin message
        const isAdminMessage = await checkIfAdminMessage(senderId)
        if (isAdminMessage) {
            await handleAdminMessage(event)
            return
        }

        // Get user data
        const { getUserByFacebookId } = await import('@/lib/database-service')
        const user = await getUserByFacebookId(senderId)

        // Create user object for UnifiedBotSystem - ENSURE CORRECT FACEBOOK_ID
        const userObj = user || {
            facebook_id: senderId,
            status: 'pending', // Changed from 'new_user' to 'pending' to match database constraint
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
            status: 'pending', // Changed from 'new_user' to 'pending' to match database constraint
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

// Check if message is from admin
async function checkIfAdminMessage(senderId: string): Promise<boolean> {
    try {
        // Check if sender is admin (Facebook Page ID)
        if (senderId === CONFIG.BOT.APP_ID) {
            return true
        }

        // Check if sender is in admin_users table
        const { data } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('facebook_id', senderId)
            .eq('is_active', true)
            .single()

        return !!data
    } catch (error) {
        logger.error('Error checking admin message', { senderId, error })
        return false
    }
}

// Handle admin message
async function handleAdminMessage(event: any) {
    try {
        const senderId = event.sender.id
        const message = event.message
        const text = message.text || ''

        logger.info('Processing admin message', { senderId, text })

        // Check if this is an admin command
        if (text.startsWith('/')) {
            await handleAdminCommand(senderId, text)
            return
        }

        // Check if admin is chatting with any user
        const { data: activeChats } = await supabaseAdmin
            .from('admin_chat_sessions')
            .select('user_facebook_id')
            .eq('admin_id', senderId)
            .eq('is_active', true)

        if (activeChats && activeChats.length > 0) {
            // Admin is chatting with users, forward message to all active chats
            for (const chat of activeChats) {
                await AdminTakeoverService.handleAdminMessage(chat.user_facebook_id, senderId, text)
            }
        } else {
            // Admin is not in active chat, this might be a command or general message
            logger.info('Admin message but no active chats', { senderId, text })
        }

    } catch (error) {
        logger.error('Error handling admin message', { event, error })
    }
}

// Handle admin commands
async function handleAdminCommand(adminId: string, command: string) {
    try {
        logger.info('Processing admin command', { adminId, command })

        const { sendMessage } = await import('@/lib/facebook-api')

        // Parse command and arguments
        const parts = command.split(' ')
        const commandName = parts[0].toLowerCase()
        const args = parts.slice(1)

        switch (commandName) {
            case '/stop':
                if (args.length === 0) {
                    await sendMessage(adminId, '❌ Lệnh /stop cần ID user hoặc "all"\nVí dụ: /stop 123456789 hoặc /stop all')
                    return
                }

                if (args[0] === 'all') {
                    // Stop bot for all users
                    const { updateBotStatus } = await import('@/lib/database-service')
                    await updateBotStatus('stopped')
                    await sendMessage(adminId, '✅ Đã dừng bot cho tất cả users')
                } else {
                    // Stop bot for specific user
                    const targetUserId = args[0]
                    const { UnifiedUserStateManager } = await import('@/lib/core/unified-user-state-manager')
                    await UnifiedUserStateManager.updateUserInteractionState(targetUserId, { bot_active: false })
                    await sendMessage(adminId, `✅ Đã dừng bot cho user: ${targetUserId}`)
                }
                break

            case '/start':
                if (args.length === 0) {
                    await sendMessage(adminId, '❌ Lệnh /start cần ID user hoặc "all"\nVí dụ: /start 123456789 hoặc /start all')
                    return
                }

                if (args[0] === 'all') {
                    // Start bot for all users
                    const { updateBotStatus } = await import('@/lib/database-service')
                    await updateBotStatus('active')
                    await sendMessage(adminId, '✅ Đã kích hoạt bot cho tất cả users')
                } else {
                    // Start bot for specific user
                    const targetUserId = args[0]
                    const { UnifiedUserStateManager } = await import('@/lib/core/unified-user-state-manager')
                    await UnifiedUserStateManager.updateUserInteractionState(targetUserId, { bot_active: true })
                    await sendMessage(adminId, `✅ Đã kích hoạt bot cho user: ${targetUserId}`)
                }
                break

            case '/status':
                // Show bot status
                const { getBotStatus } = await import('@/lib/database-service')
                const botStatus = await getBotStatus()
                await sendMessage(adminId, `🤖 Trạng thái bot: ${botStatus}`)
                break

            case '/help':
                await sendMessage(adminId,
                    '💡 ADMIN COMMANDS\n━━━━━━━━━━━━━━━━━━━━\n' +
                    '/stop <user_id|all> - Dừng bot\n' +
                    '/start <user_id|all> - Kích hoạt bot\n' +
                    '/status - Xem trạng thái bot\n' +
                    '/send <user_id> <message> - Gửi tin nhắn\n' +
                    '/buttons <user_id> <message> - Gửi nút\n' +
                    '/help - Hiển thị trợ giúp\n━━━━━━━━━━━━━━━━━━━━'
                )
                break

            case '/send':
                if (args.length < 2) {
                    await sendMessage(adminId, '❌ Lệnh /send cần user_id và message\nVí dụ: /send 123456789 Hello user')
                    return
                }

                const targetUserId = args[0]
                const messageToSend = args.slice(1).join(' ')

                const { sendMessage: sendToUser } = await import('@/lib/facebook-api')
                await sendToUser(targetUserId, `💬 Từ admin: ${messageToSend}`)
                await sendMessage(adminId, `✅ Đã gửi tin nhắn đến user: ${targetUserId}`)
                break

            case '/buttons':
                if (args.length < 2) {
                    await sendMessage(adminId, '❌ Lệnh /buttons cần user_id và message\nVí dụ: /buttons 123456789 Chọn chức năng')
                    return
                }

                const buttonUserId = args[0]
                const buttonMessage = args.slice(1).join(' ')

                // Gửi nút cơ bản
                const { sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                await sendQuickReply(buttonUserId, `💬 ${buttonMessage}`, [
                    createQuickReply('🚀 ĐĂNG KÝ', 'REGISTER'),
                    createQuickReply('🛒 ĐĂNG BÁN HÀNG', 'LISTING'),
                    createQuickReply('🔍 TÌM KIẾM', 'SEARCH'),
                    createQuickReply('💳 NÂNG CẤP', 'UPGRADE'),
                    createQuickReply(' LIÊN HỆ ADMIN', 'CONTACT_ADMIN'),
                    createQuickReply('ℹ️ THÔNG TIN', 'INFO')
                ])
                await sendMessage(adminId, `✅ Đã gửi nút đến user: ${buttonUserId}`)
                break

            case '/search':
                if (args.length < 2) {
                    await sendMessage(adminId, '❌ Lệnh /search cần user_id và từ khóa\nVí dụ: /search 123456789 điện thoại')
                    return
                }

                const searchUserId = args[0]
                const searchKeyword = args.slice(1).join(' ')

                // Tìm kiếm giúp user (thu phí 5,000)
                const { supabaseAdmin: adminDb } = await import('@/lib/supabase')
                const { sendMessage: sendMessageToUser, createGenericElement, sendGenericTemplate } = await import('@/lib/facebook-api')
                const { formatCurrency } = await import('@/lib/formatters')

                // Tìm kiếm listings
                const { data: listings, error } = await adminDb
                    .from('listings')
                    .select('*')
                    .ilike('title', `%${searchKeyword}%`)
                    .eq('status', 'active')
                    .limit(5)

                if (error) {
                    await sendMessage(adminId, `❌ Lỗi tìm kiếm: ${error.message}`)
                    return
                }

                if (!listings || listings.length === 0) {
                    await sendMessageToUser(searchUserId, `🔍 Admin tìm giúp: Không tìm thấy "${searchKeyword}"`)
                    await sendMessage(adminId, `ℹ️ Không tìm thấy kết quả cho: ${searchKeyword}`)
                    return
                }

                // Gửi kết quả cho user
                await sendMessageToUser(searchUserId, `🔍 Admin tìm giúp: "${searchKeyword}" - Tìm thấy ${listings.length} kết quả`)

                const elements = listings.map(listing =>
                    createGenericElement(
                        listing.title,
                        `${formatCurrency(listing.price)} • ${listing.location}`,
                        undefined,
                        [
                            {
                                type: 'postback',
                                title: '👁️ Xem chi tiết',
                                payload: `VIEW_LISTING_${listing.id}`
                            }
                        ]
                    )
                )

                await sendGenericTemplate(searchUserId, elements)

                // Thu phí 5,000 cho dịch vụ tìm kiếm
                await sendMessageToUser(searchUserId, `💰 Phí dịch vụ tìm kiếm: 5,000 VNĐ\n💳 Vui lòng thanh toán để tiếp tục sử dụng`)

                await sendMessage(adminId, `✅ Đã tìm kiếm "${searchKeyword}" cho user ${searchUserId} (${listings.length} kết quả)`)
                break

            default:
                await sendMessage(adminId, '❌ Lệnh không hợp lệ. Gõ /help để xem danh sách lệnh.')
        }

        logger.info('Admin command executed', { adminId, command })

    } catch (error) {
        logger.error('Error handling admin command', { adminId, command, error })
        const { sendMessage } = await import('@/lib/facebook-api')
        await sendMessage(adminId, '❌ Có lỗi xảy ra khi thực hiện lệnh')
    }
}
