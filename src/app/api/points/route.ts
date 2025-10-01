import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateUserLevel } from '@/lib/utils'

// Get user points
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const { data: userPoints, error } = await supabaseAdmin
            .from('user_points')
            .select('*')
            .eq('user_id', user_id)
            .single()

        if (error) {
            console.error('Error fetching user points:', error)
            return NextResponse.json(
                { error: 'Failed to fetch user points' },
                { status: 500 }
            )
        }

        // Get point transactions
        const { data: transactions, error: transError } = await supabaseAdmin
            .from('point_transactions')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (transError) {
            console.error('Error fetching transactions:', transError)
        }

        return NextResponse.json({
            userPoints: userPoints || { points: 0, level: 'Đồng', streak_days: 0 },
            transactions: transactions || []
        })
    } catch (error) {
        console.error('Error in GET /api/points:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Add points to user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, points, reason } = body

        // Validate required fields
        if (!user_id || !points || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate points
        if (points <= 0) {
            return NextResponse.json(
                { error: 'Points must be greater than 0' },
                { status: 400 }
            )
        }

        // Add point transaction
        const { data: transaction, error } = await supabaseAdmin
            .from('point_transactions')
            .insert({
                user_id,
                points,
                reason
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding points:', error)
            return NextResponse.json(
                { error: 'Failed to add points' },
                { status: 500 }
            )
        }

        // Update user points
        const { data: userPoints } = await supabaseAdmin
            .from('user_points')
            .select('points')
            .eq('user_id', user_id)
            .single()

        const currentPoints = userPoints?.points || 0
        const newPoints = currentPoints + points
        const newLevel = calculateUserLevel(newPoints)

        await supabaseAdmin
            .from('user_points')
            .upsert({
                user_id,
                points: newPoints,
                level: newLevel,
                updated_at: new Date().toISOString()
            })

        return NextResponse.json({
            transaction,
            newPoints,
            newLevel
        })
    } catch (error) {
        console.error('Error in POST /api/points:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get leaderboard
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '10')

        const { data: leaderboard, error } = await supabaseAdmin
            .from('user_points')
            .select(`
        points,
        level,
        streak_days,
        user:user_id (
          id,
          name,
          location,
          rating
        )
      `)
            .order('points', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching leaderboard:', error)
            return NextResponse.json(
                { error: 'Failed to fetch leaderboard' },
                { status: 500 }
            )
        }

        return NextResponse.json({ leaderboard })
    } catch (error) {
        console.error('Error in PATCH /api/points:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
