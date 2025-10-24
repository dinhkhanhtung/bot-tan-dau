import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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
        const status = searchParams.get('status') || 'all'
        const limit = parseInt(searchParams.get('limit') || '100')

        // Build query
        let query = supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        // Apply status filter
        if (status !== 'all') {
            query = query.eq('status', status)
        }

        const { data: users, error } = await query

        if (error) {
            console.error('Error fetching users:', error)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            users: users || []
        })

    } catch (error) {
        console.error('Admin users error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
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

        // Get user ID from URL
        const url = new URL(request.url)
        const userId = url.searchParams.get('id')

        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'User ID is required' },
                { status: 400 }
            )
        }

        // Get user data first to get facebook_id
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('facebook_id, name')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            console.error('Error fetching user:', userError)
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            )
        }

        const facebookId = user.facebook_id

        // Delete user and all related data (CASCADE will handle related records)
        const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (deleteError) {
            console.error('Error deleting user:', deleteError)
            return NextResponse.json(
                { success: false, message: 'Failed to delete user' },
                { status: 500 }
            )
        }

        // Additional cleanup for related tables that don't have CASCADE
        // (These should be handled by CASCADE, but let's be safe)

        // Clean up user_interactions
        await supabaseAdmin
            .from('user_interactions')
            .delete()
            .eq('facebook_id', facebookId)

        // Clean up bot_sessions
        await supabaseAdmin
            .from('bot_sessions')
            .delete()
            .eq('facebook_id', facebookId)

        // Clean up admin_takeover_states
        await supabaseAdmin
            .from('admin_takeover_states')
            .delete()
            .eq('user_id', facebookId)

        // Clean up admin_chat_sessions
        await supabaseAdmin
            .from('admin_chat_sessions')
            .delete()
            .eq('user_facebook_id', facebookId)

        // Clean up spam_tracking
        await supabaseAdmin
            .from('spam_tracking')
            .delete()
            .eq('user_id', facebookId)

        // Clean up user_activities
        await supabaseAdmin
            .from('user_activities')
            .delete()
            .eq('facebook_id', facebookId)

        // Clean up user_activity_logs
        await supabaseAdmin
            .from('user_activity_logs')
            .delete()
            .eq('facebook_id', facebookId)

        // Clean up chat_bot_offer_counts
        await supabaseAdmin
            .from('chat_bot_offer_counts')
            .delete()
            .eq('facebook_id', facebookId)

        // Clean up user_bot_modes
        await supabaseAdmin
            .from('user_bot_modes')
            .delete()
            .eq('facebook_id', facebookId)

        console.log(`✅ User ${user.name} (${facebookId}) deleted successfully with all related data`)

        return NextResponse.json({
            success: true,
            message: `User ${user.name} deleted successfully`
        })

    } catch (error) {
        console.error('Admin delete user error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
