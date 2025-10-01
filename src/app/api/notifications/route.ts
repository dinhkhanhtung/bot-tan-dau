import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create new notification
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, type, title, message } = body

        // Validate required fields
        if (!user_id || !type || !title || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate type
        const validTypes = ['listing', 'message', 'birthday', 'horoscope', 'payment', 'event', 'ai_suggestion', 'security']
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid notification type' },
                { status: 400 }
            )
        }

        // Create notification
        const { data: notification, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id,
                type,
                title,
                message
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating notification:', error)
            return NextResponse.json(
                { error: 'Failed to create notification' },
                { status: 500 }
            )
        }

        return NextResponse.json({ notification }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get notifications for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const unread_only = searchParams.get('unread_only') === 'true'
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        let query = supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (unread_only) {
            query = query.eq('is_read', false)
        }

        const { data: notifications, error } = await query

        if (error) {
            console.error('Error fetching notifications:', error)
            return NextResponse.json(
                { error: 'Failed to fetch notifications' },
                { status: 500 }
            )
        }

        // Get unread count
        const { count: unreadCount } = await supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .eq('is_read', false)

        return NextResponse.json({
            notifications,
            unreadCount: unreadCount || 0
        })
    } catch (error) {
        console.error('Error in GET /api/notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Mark notification as read
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, is_read } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Notification ID is required' },
                { status: 400 }
            )
        }

        const { data: notification, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating notification:', error)
            return NextResponse.json(
                { error: 'Failed to update notification' },
                { status: 500 }
            )
        }

        return NextResponse.json({ notification })
    } catch (error) {
        console.error('Error in PUT /api/notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Mark all notifications as read for a user
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id } = body

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user_id)
            .eq('is_read', false)

        if (error) {
            console.error('Error marking notifications as read:', error)
            return NextResponse.json(
                { error: 'Failed to mark notifications as read' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'All notifications marked as read' })
    } catch (error) {
        console.error('Error in PATCH /api/notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete notification
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Notification ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting notification:', error)
            return NextResponse.json(
                { error: 'Failed to delete notification' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Notification deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
