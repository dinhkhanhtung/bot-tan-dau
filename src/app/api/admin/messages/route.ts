import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminTakeoverService } from '@/lib/admin-takeover-service'
import { sendMessage } from '@/lib/facebook-api'
import { logger } from '@/lib/logger'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// POST: Gửi tin nhắn từ admin đến user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { admin_id, user_facebook_id, message } = body

        if (!admin_id || !user_facebook_id || !message) {
            return NextResponse.json(
                { success: false, message: 'Admin ID, user Facebook ID, and message are required' },
                { status: 400 }
            )
        }

        // Kiểm tra xem admin có đang chat với user này không
        const isAdminActive = await AdminTakeoverService.isAdminActive(user_facebook_id)
        if (!isAdminActive) {
            return NextResponse.json(
                { success: false, message: 'Admin is not active for this user' },
                { status: 400 }
            )
        }

        // Gửi tin nhắn đến user
        await sendMessage(user_facebook_id, message)

        // Cập nhật timestamp trong admin_chat_sessions
        await supabaseAdmin
            .from('admin_chat_sessions')
            .update({
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_facebook_id', user_facebook_id)
            .eq('admin_id', admin_id)
            .eq('is_active', true)

        // Log tin nhắn
        await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: `admin_${admin_id}_${user_facebook_id}`,
                sender_id: admin_id,
                sender_type: 'admin',
                recipient_id: user_facebook_id,
                recipient_type: 'user',
                content: message,
                message_type: 'text',
                created_at: new Date().toISOString()
            })

        logger.info('Admin message sent', { admin_id, user_facebook_id, message })

        return NextResponse.json({
            success: true,
            message: 'Message sent successfully'
        })

    } catch (error) {
        logger.error('Exception in POST admin messages', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: Lấy tin nhắn giữa admin và user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get('admin_id')
        const userFacebookId = searchParams.get('user_facebook_id')
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!adminId || !userFacebookId) {
            return NextResponse.json(
                { success: false, message: 'Admin ID and user Facebook ID are required' },
                { status: 400 }
            )
        }

        const conversationId = `admin_${adminId}_${userFacebookId}`

        const { data, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            logger.error('Error fetching messages', { adminId, userFacebookId, error: error.message })
            return NextResponse.json(
                { success: false, message: 'Failed to fetch messages' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || []
        })

    } catch (error) {
        logger.error('Exception in GET admin messages', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
