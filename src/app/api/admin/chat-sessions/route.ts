import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminTakeoverService } from '@/lib/admin-takeover-service'
import { UserInteractionService } from '@/lib/user-interaction-service'
import { logger } from '@/lib/logger'

// GET: Lấy danh sách chat sessions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get('admin_id')
        const status = searchParams.get('status') // 'active' | 'all'

        if (!adminId) {
            return NextResponse.json(
                { success: false, message: 'Admin ID is required' },
                { status: 400 }
            )
        }

        let query = supabaseAdmin
            .from('admin_chat_sessions')
            .select(`
                *,
                users:user_facebook_id (
                    facebook_id,
                    name,
                    phone,
                    status
                )
            `)
            .eq('admin_id', adminId)

        if (status === 'active') {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query.order('started_at', { ascending: false })

        if (error) {
            logger.error('Error fetching chat sessions', { adminId, error: error.message })
            return NextResponse.json(
                { success: false, message: 'Failed to fetch chat sessions' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || []
        })

    } catch (error) {
        logger.error('Exception in GET chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: Bắt đầu chat với user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { admin_id, user_facebook_id } = body

        if (!admin_id || !user_facebook_id) {
            return NextResponse.json(
                { success: false, message: 'Admin ID and user Facebook ID are required' },
                { status: 400 }
            )
        }

        // Bắt đầu admin chat
        await AdminTakeoverService.startAdminChat(user_facebook_id, admin_id)

        logger.info('Admin started chat', { admin_id, user_facebook_id })

        return NextResponse.json({
            success: true,
            message: 'Admin chat started successfully'
        })

    } catch (error) {
        logger.error('Exception in POST chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT: Dừng chat với user
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { admin_id, user_facebook_id } = body

        if (!admin_id || !user_facebook_id) {
            return NextResponse.json(
                { success: false, message: 'Admin ID and user Facebook ID are required' },
                { status: 400 }
            )
        }

        // Dừng admin chat
        await AdminTakeoverService.stopAdminChat(user_facebook_id, admin_id)

        // Kích hoạt lại bot cho user
        await UserInteractionService.reactivateBot(user_facebook_id)

        logger.info('Admin stopped chat', { admin_id, user_facebook_id })

        return NextResponse.json({
            success: true,
            message: 'Admin chat stopped successfully'
        })

    } catch (error) {
        logger.error('Exception in PUT chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: Xóa chat session
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')

        if (!sessionId) {
            return NextResponse.json(
                { success: false, message: 'Session ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('admin_chat_sessions')
            .delete()
            .eq('id', sessionId)

        if (error) {
            logger.error('Error deleting chat session', { sessionId, error: error.message })
            return NextResponse.json(
                { success: false, message: 'Failed to delete chat session' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Chat session deleted successfully'
        })

    } catch (error) {
        logger.error('Exception in DELETE chat sessions', { error })
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
