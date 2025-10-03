import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { handleMessage } from '@/lib/bot-handlers'
import { sendMessage } from '@/lib/facebook-api'
import { updateBotSession, getBotSession } from '@/lib/utils'
import { UnifiedBotSystem } from '@/lib/core/unified-entry-point'

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

        // Check for duplicate message processing
        const messageId = message.mid || `${senderId}_${Date.now()}`
        if (processedMessages.has(messageId)) {
            console.log('Skipping duplicate message:', messageId)
            return
        }
        processedMessages.add(messageId)

        // Clean up old entries (keep only last 1000)
        if (processedMessages.size > 1000) {
            const entries = Array.from(processedMessages)
            processedMessages.clear()
            entries.slice(-500).forEach(entry => processedMessages.add(entry))
        }

        // Get user first to check if they exist
        const user = await getUserByFacebookId(senderId)

        // Only check spam for registered users
        if (user) {
            const { checkSpam, isUserBlocked, sendSpamWarning, sendSpamBlockMessage } = await import('@/lib/anti-spam')

            // Check if user is currently blocked
            if (await isUserBlocked(senderId)) {
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

            // Check if it's an admin first (for any message type)
            try {
                const { isAdmin } = await import('@/lib/handlers/admin-handlers')
                const isAdminUser = await isAdmin(senderId)
                if (isAdminUser) {
                    console.log('Admin user detected:', senderId)
                    // Create a temporary user object for admin
                    const adminUser = {
                        facebook_id: senderId,
                        status: 'admin',
                        name: 'Admin',
                        membership_expires_at: null
                    }

                    // Handle admin command or regular message
                    if (message.text === '/admin') {
                        const { handleAdminCommand } = await import('@/lib/handlers/admin-handlers')
                        await handleAdminCommand(adminUser)
                    } else if (message.quick_reply?.payload) {
                        // Handle Quick Reply for admin
                        const { handlePostback } = await import('@/lib/bot-handlers')
                        await handlePostback(adminUser, message.quick_reply.payload)
                    } else {
                        // Handle regular message for admin
                        const { handleMessage } = await import('@/lib/bot-handlers')
                        await handleMessage(adminUser, message.text || '')
                    }
                    return
                }
            } catch (error) {
                console.error('Error checking admin status:', error)
            }


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
                            const sessionData = {
                                current_flow: 'registration',
                                step: 'name',
                                data: {}
                            }
                            console.log('Creating registration session for user:', senderId, 'data:', JSON.stringify(sessionData, null, 2))
                            try {
                                await updateBotSession(senderId, sessionData)
                                console.log('Registration session created successfully')
                            } catch (error) {
                                console.error('Error creating registration session:', error)
                            }
                            break
                        case 'INFO':
                            await sendMessage(senderId, 'ℹ️ THÔNG TIN BOT Tân Dậu - Hỗ Trợ Chéo')
                            await sendMessage(senderId, 'Bot Tân Dậu - Hỗ Trợ Chéo là nền tảng kết nối cộng đồng sinh năm 1981. Chúng tôi cung cấp:')
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
                            await sendMessage(senderId, 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.')
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

            // Check if user is in registration flow session first
            const sessionData = await getBotSession(senderId)
            console.log('Session data for unregistered user:', JSON.stringify(sessionData, null, 2))
            if (sessionData && sessionData.session_data?.current_flow === 'registration') {
                console.log('User is in registration flow, processing text input:', message.text)
                // User is in registration flow, handle the text input
                const { handleRegistrationStep } = await import('@/lib/handlers/auth-handlers')
                await handleRegistrationStep({ facebook_id: senderId }, message.text || '', sessionData.session_data)
                return
            }

            // Check if welcome message was already sent
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('welcome_message_sent, status, created_at')
                .eq('facebook_id', senderId)
                .single()

            // Send welcome message only if not sent before
            if (!existingUser || !existingUser.welcome_message_sent) {
                try {
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                    const { getFacebookDisplayName } = await import('@/lib/utils')

                    // Get Facebook name for personalized greeting
                    const facebookName = await getFacebookDisplayName(senderId)
                    const displayName = facebookName || 'bạn'

                    // Different welcome messages based on user status
                    if (existingUser && existingUser.status === 'pending') {
                        // PENDING_USER welcome message
                        const pendingDays = existingUser.created_at ?
                            Math.ceil((Date.now() - new Date(existingUser.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

                        await sendMessage(senderId, `⏳ CHÀO MỪNG ${displayName.toUpperCase()}!`)
                        await sendMessage(senderId, `📋 Trạng thái: Đang chờ Admin duyệt (${pendingDays} ngày)`)
                        await sendMessage(senderId, '🔍 Bạn có thể tìm kiếm và xem sản phẩm')
                        await sendMessage(senderId, '🚫 Chưa thể niêm yết hoặc liên hệ người bán')
                        await sendMessage(senderId, '💡 Admin sẽ duyệt sớm nhất có thể!')

                        await sendQuickReply(
                            senderId,
                            'Chọn chức năng:',
                            [
                                createQuickReply('🔍 TÌM KIẾM SẢN PHẨM', 'SEARCH'),
                                createQuickReply('👀 XEM TIN ĐĂNG', 'VIEW_LISTINGS'),
                                createQuickReply('💬 LIÊN HỆ ADMIN', 'CONTACT_ADMIN')
                            ]
                        )
                    } else {
                        // NEW_USER welcome message
                        await sendMessage(senderId, `👋 Chào mừng ${displayName} đến với Bot Tân Dậu - Hỗ Trợ Chéo!`)
                        await sendMessage(senderId, '🤝 Cộng đồng dành riêng cho những người con Tân Dậu (sinh năm 1981)')
                        await sendMessage(senderId, '💡 Có thể bạn muốn tham gia cùng cộng đồng để kết nối và hỗ trợ lẫn nhau!')
                        await sendMessage(senderId, 'Để sử dụng bot, bạn cần đăng ký tài khoản trước.')

                        await sendQuickReply(
                            senderId,
                            'Bạn muốn:',
                            [
                                createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                                createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                                createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
                            ]
                        )
                    }

                    // Mark welcome message as sent
                    if (existingUser) {
                        await supabaseAdmin
                            .from('users')
                            .update({ welcome_message_sent: true })
                            .eq('facebook_id', senderId)
                    } else {
                        // Create a basic user record to track welcome message
                        await supabaseAdmin
                            .from('users')
                            .insert({
                                facebook_id: senderId,
                                name: 'User',
                                phone: `temp_${senderId.slice(-10)}`, // Use unique temp phone
                                location: 'Unknown',
                                birthday: 1981,
                                referral_code: `TD1981-${senderId.slice(-6)}`,
                                welcome_message_sent: true
                            })
                    }
                } catch (error) {
                    console.error('Error sending welcome message:', error)
                }
            } else {
                // User already received welcome message, send a brief response
                try {
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                    await sendMessage(senderId, 'Bạn cần hỗ trợ gì?')
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
                    console.error('Error sending brief response:', error)
                }
            }
            return
        }

        // Check if this is a reaction (like, love, etc.) - skip processing
        if (message.reaction || message.reactions) {
            console.log('Skipping reaction message:', message.reaction || message.reactions)
            return
        }

        // SỬ DỤNG UNIFIED BOT SYSTEM - ĐÃ ĐƠN GIẢN HÓA
        try {
            // Tạo user object chuẩn
            const userObj = user || {
                facebook_id: senderId,
                status: 'new_user',
                name: 'User',
                membership_expires_at: null
            }

            // Xử lý bằng UnifiedBotSystem với logic đơn giản hơn
            if (message.quick_reply && message.quick_reply.payload) {
                // Quick Reply - ưu tiên cao nhất
                console.log('🔄 Quick Reply via UnifiedBotSystem:', message.quick_reply.payload)
                await UnifiedBotSystem.handleMessage(userObj, '', true, message.quick_reply.payload)
            } else if (message.text) {
                // Text message thường
                console.log('📝 Text message via UnifiedBotSystem:', message.text)
                await UnifiedBotSystem.handleMessage(userObj, message.text)
            } else if (message.attachments && message.attachments.length > 0) {
                // Attachment - xử lý đơn giản
                console.log('📎 Attachment via UnifiedBotSystem')
                await UnifiedBotSystem.handleMessage(userObj, '📎 Đã nhận file/ảnh')
            } else if (message.sticker_id) {
                // Sticker - phản hồi vui vẻ
                console.log('😊 Sticker via UnifiedBotSystem')
                await UnifiedBotSystem.handleMessage(userObj, '😊 Cảm ơn sticker dễ thương!')
            } else {
                // Các loại message khác
                console.log('❓ Other message type via UnifiedBotSystem')
                await UnifiedBotSystem.handleMessage(userObj, 'other')
            }
        } catch (error) {
            console.error('❌ Lỗi UnifiedBotSystem:', error)
            // Fallback đơn giản về hệ thống cũ
            try {
                if (message.text) {
                    if (message.quick_reply && message.quick_reply.payload) {
                        await handlePostbackEvent({
                            sender: { id: senderId },
                            postback: { payload: message.quick_reply.payload }
                        })
                    } else {
                        await handleTextMessage(user, message.text)
                    }
                }
            } catch (fallbackError) {
                console.error('❌ Fallback cũng lỗi:', fallbackError)
            }
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
const processedMessages = new Set<string>()

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
    let user = await getUserByFacebookId(senderId)

    // Check if it's an admin if no user found
    if (!user) {
        try {
            const { isAdmin } = await import('@/lib/handlers/admin-handlers')
            const isAdminUser = await isAdmin(senderId)
            if (isAdminUser) {
                console.log('Admin user detected in postback:', senderId)
                // Create a temporary user object for admin
                user = {
                    facebook_id: senderId,
                    status: 'admin',
                    name: 'Admin',
                    membership_expires_at: null
                }
            }
        } catch (error) {
            console.error('Error checking admin status in postback:', error)
        }
    }

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

    // SỬ DỤNG UNIFIED BOT SYSTEM CHO POSTBACK
    try {
        console.log('Handling postback for user via UnifiedBotSystem:', user.facebook_id, 'payload:', payload)

        // Tạo user object chuẩn cho UnifiedBotSystem
        const userObj = user || {
            facebook_id: senderId,
            status: 'new_user',
            name: 'User',
            membership_expires_at: null
        }

        // Xử lý bằng UnifiedBotSystem
        await UnifiedBotSystem.handleMessage(userObj, '', true, payload)
    } catch (error) {
        console.error('Error in UnifiedBotSystem postback:', error)
        // Fallback về hệ thống cũ nếu cần
        try {
            await handlePostback(user, payload)
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError)
            try {
                await sendMessageToUser(senderId, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau!')
            } catch (sendError) {
                console.error('Error sending error message:', sendError)
            }
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
