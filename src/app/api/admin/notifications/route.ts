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
