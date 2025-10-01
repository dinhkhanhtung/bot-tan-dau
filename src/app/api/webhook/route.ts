import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { handleMessage } from '@/lib/bot-handlers'
import { sendMessage } from '@/lib/facebook-api'
import { updateBotSession, getBotSession } from '@/lib/utils'

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
        .update(payload)
        .digest('hex')

    return signature === `sha256=${expectedSignature}`
}

// Force rebuild - updated 2025-10-01

// Handle GET request (webhook verification)
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully')
        return new NextResponse(challenge, { status: 200 })
    }

    console.log('Webhook verification failed')
    return new NextResponse('Forbidden', { status: 403 })
}

// Handle POST request (webhook events)
export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const signature = request.headers.get('x-hub-signature-256')

        console.log('Webhook received:', { body, signature })

        // Verify signature
        if (signature && !verifySignature(body, signature)) {
            console.log('Invalid signature')
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

        return new NextResponse('OK', { status: 200 })
    } catch (error) {
        console.error('Webhook error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

// Handle webhook events
async function handleWebhookEvent(event: any) {
    try {
        // Check if bot is stopped
        const { data: botStatus } = await supabaseAdmin
            .from('bot_settings')
            .select('value')
            .eq('key', 'bot_status')
            .single()

        if (botStatus?.value === 'stopped') {
            console.log('Bot is stopped, ignoring webhook event')
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
            console.log('Message delivered:', event.delivery)
        }
        // Handle read confirmations
        else if (event.read) {
            console.log('Message read:', event.read)
        }
    } catch (error) {
        console.error('Error handling webhook event:', error)
    }
}

// Handle message events
async function handleMessageEvent(event: any) {
    try {
        const senderId = event.sender.id
        const message = event.message

        // Skip if message is from bot
        if (senderId === process.env.FACEBOOK_APP_ID) {
            return
        }

        // Get user first to check if they exist
        const user = await getUserByFacebookId(senderId)
        
        // Only check spam for registered users
        if (user) {
            const { checkSpam, isUserBlocked, sendSpamWarning, sendSpamBlockMessage } = await import('@/lib/anti-spam')
            
            // Check if user is currently blocked
            if (isUserBlocked(senderId)) {
                await sendSpamBlockMessage(senderId)
                return
            }

            // Check for spam
            const spamCheck = await checkSpam(senderId, message.text || '')
            
            if (spamCheck.shouldBlock) {
                await sendSpamBlockMessage(senderId)
                return
            }

            if (spamCheck.warningCount > 0) {
                await sendSpamWarning(senderId, spamCheck.warningCount)
                // Continue processing but with warning
            }
        }

        // Log message to database for spam tracking
        try {
            await logMessage(senderId, message.text || '', message.mid || '')
        } catch (error) {
            console.error('Error logging message:', error)
        }

        // Check if user exists (already got user above)
        if (!user) {
            console.log('User not found for facebook_id:', senderId)
            
            // Handle Quick Reply for unregistered users
            if (message.quick_reply?.payload) {
                console.log('Handling Quick Reply for unregistered user:', message.quick_reply.payload)
                try {
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                    
                    switch (message.quick_reply.payload) {
                        case 'REGISTER':
                            await sendMessage(senderId, '📝 BẮT ĐẦU ĐĂNG KÝ')
                            await sendMessage(senderId, 'Để đăng ký, bạn cần cung cấp thông tin cá nhân. Hãy bắt đầu bằng cách gửi họ tên của bạn.')
                            // Start registration flow
                            const { updateBotSession } = await import('@/lib/utils')
                            await updateBotSession(senderId, {
                                current_flow: 'registration',
                                current_step: 1,
                                registration_data: {}
                            })
                            break
                        case 'INFO':
                            await sendMessage(senderId, 'ℹ️ THÔNG TIN BOT TÂN DẬU 1981')
                            await sendMessage(senderId, 'Bot Tân Dậu 1981 là nền tảng kết nối cộng đồng sinh năm 1981. Chúng tôi cung cấp:')
                            await sendMessage(senderId, '• 🛒 Niêm yết sản phẩm/dịch vụ\n• 🔍 Tìm kiếm và kết nối\n• 👥 Cộng đồng Tân Dậu\n• 💰 Thanh toán an toàn\n• ⭐ Hệ thống đánh giá')
                            await sendQuickReply(
                                senderId,
                                'Bạn muốn:',
                                [
                                    createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                                    createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN')
                                ]
                            )
                            break
                        case 'CONTACT_ADMIN':
                            await sendMessage(senderId, '💬 LIÊN HỆ ADMIN')
                            await sendMessage(senderId, 'Để được hỗ trợ, vui lòng liên hệ:\n📞 Hotline: 0901 234 567\n📧 Email: admin@tandau1981.com\n⏰ Thời gian: 8:00 - 22:00')
                            await sendQuickReply(
                                senderId,
                                'Bạn muốn:',
                                [
                                    createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                                    createQuickReply('ℹ️ TÌM HIỂU', 'INFO')
                                ]
                            )
                            break
                        default:
                            await sendMessage(senderId, '❌ Lựa chọn không hợp lệ. Vui lòng chọn lại.')
                            await sendQuickReply(
                                senderId,
                                'Bạn muốn:',
                                [
                                    createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                                    createQuickReply('ℹ️ TÌM HIỂU', 'INFO'),
                                    createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN')
                                ]
                            )
                    }
                } catch (error) {
                    console.error('Error handling Quick Reply for unregistered user:', error)
                }
                return
            }
            
            // Send welcome message for new users (only if not Quick Reply)
            try {
                const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                await sendMessage(senderId, '👋 Chào mừng bạn đến với Bot Tân Dậu 1981!')
                await sendMessage(senderId, 'Để sử dụng bot, bạn cần đăng ký tài khoản trước.')
                
                await sendQuickReply(
                    senderId,
                    'Bạn muốn:',
                    [
                        createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                        createQuickReply('ℹ️ TÌM HIỂU', 'INFO'),
                        createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN')
                    ]
                )
            } catch (error) {
                console.error('Error sending welcome message:', error)
            }
            return
        }

        // Handle different message types
        if (message.text) {
            // Check if it's a quick reply
            if (message.quick_reply && message.quick_reply.payload) {
                await handlePostbackEvent({
                    sender: { id: senderId },
                    postback: { payload: message.quick_reply.payload }
                })
            } else {
                await handleTextMessage(user, message.text)
            }
        } else if (message.attachments) {
            await handleAttachmentMessage(user, message.attachments)
        }
    } catch (error) {
        console.error('Error handling message event:', error)
        // Try to send error message to sender if possible
        try {
            const senderId = event?.sender?.id
            if (senderId) {
                await sendMessageToUser(senderId, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
            }
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Cache to prevent duplicate postback processing
const processedPostbacks = new Set<string>()

// Handle postback events (button clicks)
async function handlePostbackEvent(event: any) {
    const senderId = event.sender.id
    const payload = event.postback.payload
    const messageId = event.postback.mid || `${senderId}_${payload}_${Date.now()}`
    
    // Check if this postback was already processed
    if (processedPostbacks.has(messageId)) {
        console.log('Skipping duplicate postback:', messageId)
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

    // Get user
    const user = await getUserByFacebookId(senderId)
    if (!user) {
        // Send registration prompt for unregistered users
        try {
            const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
            await sendMessage(senderId, '❌ Bạn cần đăng ký trước để sử dụng chức năng này!')
            await sendMessage(senderId, 'Để sử dụng bot, bạn cần tạo tài khoản trước.')
            
            await sendQuickReply(
                senderId,
                'Bạn muốn:',
                [
                    createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                    createQuickReply('ℹ️ TÌM HIỂU', 'INFO'),
                    createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN')
                ]
            )
        } catch (error) {
            console.error('Error sending registration prompt:', error)
        }
        return
    }

    // Handle postback payload for registered users
    try {
        await handlePostback(user, payload)
    } catch (error) {
        console.error('Error handling postback:', error)
        try {
            await sendMessageToUser(senderId, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Handle text messages
async function handleTextMessage(user: any, text: string) {
    // Check if user exists and has required properties
    if (!user || !user.facebook_id) {
        console.error('Invalid user in handleTextMessage:', user)
        return
    }

    // Check if user is admin
    if (text === '/admin') {
        try {
            const { handleAdminCommand } = await import('@/lib/handlers/admin-handlers')
            await handleAdminCommand(user)
        } catch (error) {
            console.error('Error handling admin command:', error)
        }
        return
    }

    // Check if user wants to delete their account (for testing)
    if (text === '/delete' || text === '/xoa') {
        try {
            const success = await deleteUserFromFacebook(user.facebook_id)
            if (success) {
                await sendMessageToUser(user.facebook_id, '✅ Tài khoản đã được xóa! Bạn có thể đăng ký lại.')
            } else {
                await sendMessageToUser(user.facebook_id, '❌ Không thể xóa tài khoản. Vui lòng thử lại sau.')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            await sendMessageToUser(user.facebook_id, '❌ Có lỗi xảy ra khi xóa tài khoản.')
        }
        return
    }

    // Handle regular user messages
    try {
        const { handleMessage } = await import('@/lib/bot-handlers')
        await handleMessage(user, text)
    } catch (error) {
        console.error('Error handling user message:', error)
        try {
            await sendMessageToUser(user.facebook_id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Handle attachment messages
async function handleAttachmentMessage(user: any, attachments: any[]) {
    // Check if user exists and has required properties
    if (!user || !user.facebook_id) {
        console.error('Invalid user in handleAttachmentMessage:', user)
        return
    }

    try {
        for (const attachment of attachments) {
            if (attachment.type === 'image') {
                await handleImageAttachment(user, attachment)
            } else if (attachment.type === 'file') {
                await handleFileAttachment(user, attachment)
            }
        }
    } catch (error) {
        console.error('Error handling attachment message:', error)
        try {
            await sendMessageToUser(user.facebook_id, 'Xin lỗi, có lỗi xảy ra khi xử lý file. Vui lòng thử lại sau!')
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Handle image attachments
async function handleImageAttachment(user: any, attachment: any) {
    try {
        const imageUrl = attachment.payload.url

        // Check if user is in payment flow
        const session = await getBotSession(user.id)
        if (session?.current_flow === 'payment' && session?.current_step === 2) {
            // Handle payment receipt
            await handlePaymentReceipt(user, imageUrl)
        } else if (session?.current_flow === 'listing' && session?.current_step === 5) {
            // Handle listing images
            await handleListingImages(user, imageUrl)
        } else {
            await sendMessageToUser(user.facebook_id, 'Cảm ơn bạn đã gửi ảnh! Tôi sẽ xử lý sau.')
        }
    } catch (error) {
        console.error('Error handling image attachment:', error)
        try {
            await sendMessageToUser(user.facebook_id, 'Xin lỗi, có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại sau!')
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Handle file attachments
async function handleFileAttachment(user: any, attachment: any) {
    try {
        const fileUrl = attachment.payload.url
        await sendMessageToUser(user.facebook_id, 'Cảm ơn bạn đã gửi file! Tôi sẽ xử lý sau.')
    } catch (error) {
        console.error('Error handling file attachment:', error)
        try {
            await sendMessageToUser(user.facebook_id, 'Xin lỗi, có lỗi xảy ra khi xử lý file. Vui lòng thử lại sau!')
        } catch (sendError) {
            console.error('Error sending error message:', sendError)
        }
    }
}

// Database helper functions
async function getUserByFacebookId(facebookId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', facebookId)
            .single()

        if (error) {
            // PGRST116 means no rows found, which is normal for new users
            if (error.code === 'PGRST116') {
                console.log('No user found for facebook_id:', facebookId)
                return null
            }
            console.error('Error getting user:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Exception getting user:', error)
        return null
    }
}

async function createUserFromFacebook(facebookId: string) {
    try {
        // Generate referral code
        const referralCode = `TD1981-${facebookId.slice(-6)}`

        // Create a basic user record
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
                facebook_id: facebookId,
                name: 'User',
                phone: '0000000000', // Provide a default phone number
                location: 'HÀ NỘI',
                birthday: 1981, // Trust-based verification - chỉ cần xác nhận năm sinh
                status: 'trial',
                membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
                referral_code: referralCode
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating user:', error)
            return null
        }

        return data
    } catch (error) {
        console.error('Error creating user:', error)
        return null
    }
}

// Delete user for testing
async function deleteUserFromFacebook(facebookId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('facebook_id', facebookId)

        if (error) {
            console.error('Error deleting user:', error)
            return false
        }

        console.log('User deleted successfully:', facebookId)
        return true
    } catch (error) {
        console.error('Exception deleting user:', error)
        return false
    }
}

// getBotSession imported from utils


// Import bot handlers
async function handleUserMessage(user: any, text: string) {
    // Check if user is new (has default name 'User')
    if (user.name === 'User' && user.phone === '0000000000') {
        // New user - show welcome message
        const { handleDefaultMessage } = await import('@/lib/bot-handlers')
        await handleDefaultMessage(user)
    } else {
        // Registered user - show registered menu
        const { handleDefaultMessageRegistered } = await import('@/lib/bot-handlers')
        await handleDefaultMessageRegistered(user)
    }
}

async function handlePostback(user: any, payload: string) {
    const { handlePostback } = await import('@/lib/bot-handlers')
    await handlePostback(user, payload)
}

async function handleAdminCommand(user: any, command: string) {
    const { handleAdminCommand } = await import('@/lib/bot-handlers')
    await handleAdminCommand(user, command)
}

async function handlePaymentReceipt(user: any, imageUrl: string) {
    const { handlePaymentReceipt } = await import('@/lib/bot-handlers')
    await handlePaymentReceipt(user, imageUrl)
}

async function handleListingImages(user: any, imageUrl: string) {
    const { handleListingImages } = await import('@/lib/bot-handlers')
    await handleListingImages(user, imageUrl)
}

// Send message to Facebook
async function sendMessageToUser(recipientId: string, message: string) {
    const { sendMessage } = await import('@/lib/facebook-api')
    await sendMessage(recipientId, message)
}

// Helper function to log message to database
async function logMessage(facebookId: string, content: string, messageId: string) {
    try {
        const { supabaseAdmin } = await import('@/lib/supabase')
        await supabaseAdmin
            .from('user_messages')
            .insert({
                user_id: facebookId,
                content: content,
                message_id: messageId,
                created_at: new Date().toISOString()
            })
    } catch (error) {
        console.error('Error logging message to database:', error)
    }
}
