import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
    try {
        // Verify admin token
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production')

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all'
        const limit = parseInt(searchParams.get('limit') || '50')

        // Build query
        let query = supabaseAdmin
            .from('notifications')
            .select(`
                *,
                users!notifications_user_id_fkey (
                    name,
                    phone
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit)

        // Apply filter
        if (filter === 'unread') {
            query = query.eq('is_read', false)
        } else if (filter !== 'all') {
            query = query.eq('type', filter)
        }

        const { data: notifications, error } = await query

        if (error) {
            console.error('Error fetching notifications:', error)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            notifications: notifications || []
        })

    } catch (error) {
        console.error('Admin notifications error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // Verify admin token
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production')

        const body = await request.json()
        const { action, ...data } = body

        // Handle different actions
        if (action === 'sendGeneral') {
            return await handleSendGeneralNotification(data.message)
        } else if (action === 'sendSpecific') {
            return await handleSendSpecificNotification(data.userId, data.message)
        } else if (action === 'sendCategory') {
            return await handleSendCategoryNotification(data.category, data.message)
        } else if (action === 'markAsRead') {
            return await handleMarkAsRead(data.notificationId)
        } else if (action === 'delete') {
            return await handleDeleteNotification(data.notificationId)
        } else if (action === 'viewHistory') {
            return await handleViewNotificationHistory()
        }

        return NextResponse.json(
            { success: false, message: 'Invalid action' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Admin notifications POST error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Send general notification to all users
async function handleSendGeneralNotification(message: string) {
    try {
        console.log('📢 Sending general notification...')
        
        // Get all active users
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, facebook_id, name')
            .eq('status', 'active')

        if (usersError) {
            console.error('Error fetching users:', usersError)
            return NextResponse.json(
                { success: false, message: 'Failed to fetch users' },
                { status: 500 }
            )
        }

        // Create notifications for all users
        const notifications = users?.map(user => ({
            user_id: user.id,
            type: 'general',
            title: 'Thông báo chung',
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        })) || []

        if (notifications.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('notifications')
                .insert(notifications)

            if (insertError) {
                console.error('Error creating notifications:', insertError)
                return NextResponse.json(
                    { success: false, message: 'Failed to create notifications' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: `General notification sent to ${users?.length || 0} users`,
            sentCount: users?.length || 0
        })

    } catch (error) {
        console.error('Send general notification error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to send general notification' },
            { status: 500 }
        )
    }
}

// Send notification to specific user
async function handleSendSpecificNotification(userId: string, message: string) {
    try {
        console.log('📢 Sending specific notification to user:', userId)
        
        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'specific',
                title: 'Thông báo cá nhân',
                message: message,
                is_read: false,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error creating notification:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to send notification' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notification sent successfully'
        })

    } catch (error) {
        console.error('Send specific notification error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to send specific notification' },
            { status: 500 }
        )
    }
}

// Send notification to users by category
async function handleSendCategoryNotification(category: string, message: string) {
    try {
        console.log('📢 Sending category notification for:', category)
        
        // Get users by category (assuming category is stored in user profile)
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, facebook_id, name')
            .eq('status', 'active')
            .ilike('interests', `%${category}%`) // Assuming interests field contains categories

        if (usersError) {
            console.error('Error fetching users by category:', usersError)
            return NextResponse.json(
                { success: false, message: 'Failed to fetch users by category' },
                { status: 500 }
            )
        }

        // Create notifications for category users
        const notifications = users?.map(user => ({
            user_id: user.id,
            type: 'category',
            title: `Thông báo ${category}`,
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        })) || []

        if (notifications.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('notifications')
                .insert(notifications)

            if (insertError) {
                console.error('Error creating category notifications:', insertError)
                return NextResponse.json(
                    { success: false, message: 'Failed to create category notifications' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: `Category notification sent to ${users?.length || 0} users`,
            sentCount: users?.length || 0
        })

    } catch (error) {
        console.error('Send category notification error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to send category notification' },
            { status: 500 }
        )
    }
}

// Mark notification as read
async function handleMarkAsRead(notificationId: string) {
    try {
        console.log('✅ Marking notification as read:', notificationId)
        
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)

        if (error) {
            console.error('Error marking notification as read:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to mark notification as read' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notification marked as read'
        })

    } catch (error) {
        console.error('Mark as read error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to mark notification as read' },
            { status: 500 }
        )
    }
}

// Delete notification
async function handleDeleteNotification(notificationId: string) {
    try {
        console.log('🗑️ Deleting notification:', notificationId)
        
        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', notificationId)

        if (error) {
            console.error('Error deleting notification:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to delete notification' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notification deleted successfully'
        })

    } catch (error) {
        console.error('Delete notification error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to delete notification' },
            { status: 500 }
        )
    }
}

// View notification history
async function handleViewNotificationHistory() {
    try {
        console.log('📋 Retrieving notification history...')
        
        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select(`
                *,
                users!notifications_user_id_fkey (
                    name,
                    phone
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            console.error('Error fetching notification history:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to fetch notification history' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notification history retrieved successfully',
            notifications: notifications || []
        })

    } catch (error) {
        console.error('View notification history error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to retrieve notification history' },
            { status: 500 }
        )
    }
}