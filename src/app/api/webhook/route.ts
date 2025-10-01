import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { handleMessage } from '@/lib/bot-handlers'

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
        .update(payload)
        .digest('hex')

    return signature === `sha256=${expectedSignature}`
}

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

        // Verify signature
        if (!signature || !verifySignature(body, signature)) {
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
    const senderId = event.sender.id
    const message = event.message

    // Skip if message is from bot
    if (senderId === process.env.FACEBOOK_APP_ID) {
        return
    }

    // Get or create user
    let user = await getUserByFacebookId(senderId)
    if (!user) {
        user = await createUserFromFacebook(senderId)
    }

    // Handle different message types
    if (message.text) {
        await handleTextMessage(user, message.text)
    } else if (message.attachments) {
        await handleAttachmentMessage(user, message.attachments)
    }
}

// Handle postback events (button clicks)
async function handlePostbackEvent(event: any) {
    const senderId = event.sender.id
    const payload = event.postback.payload

    // Get user
    const user = await getUserByFacebookId(senderId)
    if (!user) {
        await sendMessage(senderId, 'Vui lòng đăng ký trước khi sử dụng bot!')
        return
    }

    // Handle postback payload
    await handlePostback(user, payload)
}

// Handle text messages
async function handleTextMessage(user: any, text: string) {
    // Check if user is admin
    if (text === '/admin' && user.facebook_id === 'admin') {
        await handleAdminCommand(user)
        return
    }

    // Handle regular user messages
    await handleMessage(user, text)
}

// Handle attachment messages
async function handleAttachmentMessage(user: any, attachments: any[]) {
    for (const attachment of attachments) {
        if (attachment.type === 'image') {
            await handleImageAttachment(user, attachment)
        } else if (attachment.type === 'file') {
            await handleFileAttachment(user, attachment)
        }
    }
}

// Handle image attachments
async function handleImageAttachment(user: any, attachment: any) {
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
        await sendMessage(user.facebook_id, 'Cảm ơn bạn đã gửi ảnh! Tôi sẽ xử lý sau.')
    }
}

// Handle file attachments
async function handleFileAttachment(user: any, attachment: any) {
    const fileUrl = attachment.payload.url
    await sendMessage(user.facebook_id, 'Cảm ơn bạn đã gửi file! Tôi sẽ xử lý sau.')
}

// Database helper functions
async function getUserByFacebookId(facebookId: string) {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('facebook_id', facebookId)
        .single()

    if (error) {
        console.error('Error getting user:', error)
        return null
    }

    return data
}

async function createUserFromFacebook(facebookId: string) {
    // This will be handled in the registration flow
    return null
}

async function getBotSession(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('bot_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        return null
    }

    return data
}

async function updateBotSession(userId: string, sessionData: any) {
    const { error } = await supabaseAdmin
        .from('bot_sessions')
        .upsert({
            user_id: userId,
            session_data: sessionData,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('Error updating bot session:', error)
    }
}

// Import bot handlers
async function handleMessage(user: any, text: string) {
    const { handleMessage } = await import('@/lib/bot-handlers')
    await handleMessage(user, text)
}

async function handlePostback(user: any, payload: string) {
    const { handlePostback } = await import('@/lib/bot-handlers')
    await handlePostback(user, payload)
}

async function handleAdminCommand(user: any) {
    const { handleAdminCommand } = await import('@/lib/bot-handlers')
    await handleAdminCommand(user)
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
async function sendMessage(recipientId: string, message: string) {
    const { sendMessage } = await import('@/lib/facebook-api')
    await sendMessage(recipientId, message)
}
