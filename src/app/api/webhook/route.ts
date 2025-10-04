import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
// import { handleMessage } from '@/lib/bot-handlers' // DEPRECATED
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

        // Check spam for THIS SPECIFIC USER - SỬ DỤNG LOGIC MỚI
        const { handleAntiSpam, isUserBlocked, sendSpamBlockMessage } = await import('@/lib/anti-spam')

        console.log('🔍 Checking spam for user:', senderId, 'Message:', message.text || '')

        // Check if THIS user is currently blocked
        if (await isUserBlocked(senderId)) {
            console.log('🚫 User is blocked, sending block message')
            await sendSpamBlockMessage(senderId)
            return
        }

        // QUAN TRỌNG: Kiểm tra nút "Chat Bot" trước
        if (message.quick_reply?.payload === 'CHAT_BOT') {
            console.log('🤖 User clicked Chat Bot button')
            const { setUserBotMode, sendChatBotWelcome } = await import('@/lib/anti-spam')
            setUserBotMode(senderId)

            const userStatus = user ? (user.status === 'registered' || user.status === 'trial' ? 'registered' : 'unregistered') : 'unregistered'
            await sendChatBotWelcome(senderId, userStatus)
            return
        }

        // QUAN TRỌNG: Kiểm tra nút "Thoát Bot"
        if (message.quick_reply?.payload === 'EXIT_BOT') {
            console.log('🚪 User clicked Exit Bot button')
            const { handleBotExit } = await import('@/lib/anti-spam')
            await handleBotExit(senderId)
            return
        }

        // Check for spam using NEW logic (áp dụng cho CHỈ user này)
        const userStatus = user ? (user.status === 'registered' || user.status === 'trial' ? 'registered' : 'unregistered') : 'unregistered'
        console.log('📊 User status for spam check:', userStatus)

        // QUAN TRỌNG: Kiểm tra user có đang trong flow đăng ký không
        let currentFlow = null
        try {
            const sessionData = await getBotSession(senderId)
            currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow || null
            console.log('🔄 Current flow for spam check:', currentFlow)
        } catch (error) {
            console.error('Error getting session for spam check:', error)
        }

        const spamCheck = await handleAntiSpam(senderId, message.text || '', userStatus, currentFlow)

        if (spamCheck.block) {
            console.log('🚫 Spam check blocked user:', senderId)
            await sendSpamBlockMessage(senderId)
            return
        }

        // QUAN TRỌNG: Nếu anti-spam đã xử lý tin nhắn (gửi welcome), KHÔNG gọi UnifiedBotSystem
        if (spamCheck.message && spamCheck.action === 'none') {
            console.log('Anti-spam đã xử lý tin nhắn, không gọi UnifiedBotSystem')
            return
        }

        // QUAN TRỌNG: Nếu user chưa trong bot mode, xử lý tin nhắn thường
        const { checkUserBotMode, shouldShowChatBotButton } = await import('@/lib/anti-spam')
        const isInBotMode = await checkUserBotMode(senderId)

        if (!isInBotMode) {
            console.log('💬 User not in bot mode - processing as normal message')

            // Tăng counter cho mỗi tin nhắn thường
            const { shouldShowChatBotButton, shouldBotStopCompletely, incrementNormalMessageCount } = await import('@/lib/anti-spam')

            // Tăng counter trước khi kiểm tra
            incrementNormalMessageCount(senderId)

            // Kiểm tra bot có nên dừng hoàn toàn không
            if (shouldBotStopCompletely(senderId)) {
                console.log('🚫 Bot dừng hoàn toàn sau tin nhắn thứ 2 - không gửi gì cả')
                return
            }

            // Chỉ gửi thông báo 1 lần duy nhất
            if (shouldShowChatBotButton(senderId)) {
                const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                await sendMessage(senderId, '💬 Tùng đã nhận được tin nhắn của bạn và sẽ phản hồi sớm nhất có thể!')
                await sendMessage(senderId, '🤖 Nếu muốn sử dụng Bot Tân Dậu - Hỗ Trợ Chéo, hãy ấn nút "Chat Bot" bên dưới.')

                await sendQuickReply(
                    senderId,
                    'Chọn hành động:',
                    [
                        createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
                    ]
                )
            } else {
                console.log('🚫 User đã nhận thông báo - bot dừng hoàn toàn, để admin xử lý')
                // Bot dừng hoàn toàn, không gửi gì cả
            }
            return
        }

        // QUAN TRỌNG: Nếu user chưa đăng ký và đang trong flow đăng ký, cho phép xử lý tin nhắn
        if (!user && currentFlow === 'registration') {
            console.log('Unregistered user in registration flow - processing message normally')
            // Không return, tiếp tục xử lý tin nhắn bình thường
        }

        // Send warning if needed
        if (spamCheck.action === 'warning' && spamCheck.message) {
            const { sendMessage } = await import('@/lib/facebook-api')
            await sendMessage(senderId, spamCheck.message)
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
                        await UnifiedBotSystem.handleMessage(adminUser, '', true, message.quick_reply.payload)
                    } else {
                        // Handle regular message for admin
                        await UnifiedBotSystem.handleMessage(adminUser, message.text || '')
                    }
                    return
                }
            } catch (error) {
                console.error('Error checking admin status:', error)
            }

            // QUAN TRỌNG: Nếu user chưa đăng ký và đang trong flow đăng ký, xử lý tin nhắn bình thường
            if (currentFlow === 'registration') {
                console.log('Unregistered user in registration flow - processing message normally')
                // Tạo user object tạm thời cho UnifiedBotSystem
                const userObj = {
                    facebook_id: senderId,
                    status: 'new_user',
                    name: null,
                    phone: null,
                    membership_expires_at: null
                }

                // Xử lý tin nhắn bằng UnifiedBotSystem
                if (message.text) {
                    console.log('Processing text message for unregistered user in registration flow:', message.text)
                    await UnifiedBotSystem.handleMessage(userObj, message.text)
                } else if (message.quick_reply?.payload) {
                    console.log('Processing quick reply for unregistered user in registration flow:', message.quick_reply.payload)
                    await UnifiedBotSystem.handleMessage(userObj, '', true, message.quick_reply.payload)
                }
                return
            }


            // Handle Quick Reply for unregistered users - CHUYỂN VỀ UNIFIED SYSTEM
            if (message.quick_reply?.payload) {
                console.log('Handling Quick Reply for unregistered user via UnifiedBotSystem:', message.quick_reply.payload)
                try {
                    // Tạo user object tạm thời cho UnifiedBotSystem
                    const userObj = {
                        facebook_id: senderId,
                        status: 'new_user',
                        name: null,
                        phone: null,
                        membership_expires_at: null
                    }

                    // Xử lý bằng UnifiedBotSystem
                    await UnifiedBotSystem.handleMessage(userObj, '', true, message.quick_reply.payload)
                } catch (error) {
                    console.error('Error handling Quick Reply via UnifiedBotSystem:', error)
                    // Fallback về xử lý cũ nếu cần
                    try {
                        await handlePostbackEvent({
                            sender: { id: senderId },
                            postback: { payload: message.quick_reply.payload }
                        })
                    } catch (fallbackError) {
                        console.error('Fallback also failed:', fallbackError)
                    }
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

            // Check if welcome message was already sent - ENHANCED CHECK
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('welcome_message_sent, status, created_at')
                .eq('facebook_id', senderId)
                .single()

            // DISABLED: Welcome message logic moved to UnifiedBotSystem
            // This prevents duplicate welcome messages
            if (false) {
                try {
                    const { sendMessage, sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
                    const { getFacebookDisplayName } = await import('@/lib/utils')

                    // Get Facebook name for personalized greeting
                    const facebookName = await getFacebookDisplayName(senderId)
                    const displayName = facebookName || 'bạn'

                    // Different welcome messages based on user status
                    if (existingUser && existingUser?.status === 'pending') {
                        // PENDING_USER welcome message
                        const pendingDays = existingUser?.created_at ?
                            Math.ceil((Date.now() - new Date(existingUser?.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0

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
                        // DISABLED: Welcome message now handled by anti-spam system
                        console.log('Welcome message handled by anti-spam system')
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
                                name: null, // User must provide name during registration
                                phone: null, // User must provide phone during registration
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
                // DISABLED: Welcome message now handled by anti-spam system
                console.log('Welcome message handled by anti-spam system')
            }
            return
        }

        // Check if this is a reaction (like, love, etc.) - skip processing
        if (message.reaction || message.reactions) {
            console.log('Skipping reaction message:', message.reaction || message.reactions)
            return
        }

        // SỬ DỤNG UNIFIED BOT SYSTEM CHO TẤT CẢ CÁC LOẠI MESSAGE
        try {
            // Tạo user object chuẩn cho UnifiedBotSystem
            const userObj = user || {
                facebook_id: senderId,
                status: 'new_user',
                name: null, // User must provide name during registration
                membership_expires_at: null
            }

            // Xử lý bằng UnifiedBotSystem
            if (message.text) {
                // Check if it's a quick reply first
                if (message.quick_reply && message.quick_reply.payload) {
                    console.log('Handling Quick Reply via UnifiedBotSystem:', message.quick_reply.payload)
                    await UnifiedBotSystem.handleMessage(userObj, '', true, message.quick_reply.payload)
                } else {
                    // Handle regular text message
                    console.log('Handling regular text message via UnifiedBotSystem:', message.text)
                    await UnifiedBotSystem.handleMessage(userObj, message.text)
                }
            } else if (message.attachments && message.attachments.length > 0) {
                console.log('Handling attachment message via UnifiedBotSystem:', message.attachments.length, 'attachments')
                // Với attachment, vẫn dùng text message để xử lý
                await UnifiedBotSystem.handleMessage(userObj, 'attachment')
            } else if (message.sticker_id) {
                console.log('Handling sticker message via UnifiedBotSystem')
                await UnifiedBotSystem.handleMessage(userObj, 'sticker')
            } else {
                // Handle other message types or empty messages
                console.log('Handling other message type via UnifiedBotSystem')
                await UnifiedBotSystem.handleMessage(userObj, 'other')
            }
        } catch (error) {
            console.error('Error in UnifiedBotSystem:', error)
            // Fallback về hệ thống cũ nếu cần
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
                console.error('Fallback also failed:', fallbackError)
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
        // Send registration prompt for unregistered users - CHỈ HIỂN THỊ MENU
        try {
            const { sendQuickReply, createQuickReply } = await import('@/lib/facebook-api')
            await sendQuickReply(
                senderId,
                'Bạn cần đăng ký để sử dụng chức năng này:',
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
        await UnifiedBotSystem.handleMessage(user, text)
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
            // Handle payment receipt - TODO: Implement payment receipt handling
            await sendMessageToUser(user.facebook_id, 'Cảm ơn bạn đã gửi ảnh thanh toán! Tôi sẽ xử lý sau.')
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
                name: null, // User must provide name during registration
                phone: null, // User must provide phone during registration
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
    // Sử dụng UnifiedBotSystem để xử lý tất cả tin nhắn
    await UnifiedBotSystem.handleMessage(user, '')
}

async function handlePostback(user: any, payload: string) {
    await UnifiedBotSystem.handleMessage(user, '', true, payload)
}

async function handleAdminCommand(user: any, command: string) {
    const { handleAdminCommand } = await import('@/lib/handlers/admin-handlers')
    await handleAdminCommand(user)
}

// async function handlePaymentReceipt(user: any, imageUrl: string) {
//     // Function not implemented yet
// }

async function handleListingImages(user: any, imageUrl: string) {
    const { handleListingImages } = await import('@/lib/handlers/marketplace-handlers')
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
