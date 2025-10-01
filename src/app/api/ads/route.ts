import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AD_PACKAGES } from '@/lib/constants'

// Create new ad
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            user_id,
            title,
            description,
            image,
            budget,
            start_date,
            end_date
        } = body

        // Validate required fields
        if (!user_id || !title || !description || !budget || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate dates
        const startDate = new Date(start_date)
        const endDate = new Date(end_date)

        if (startDate >= endDate) {
            return NextResponse.json(
                { error: 'End date must be after start date' },
                { status: 400 }
            )
        }

        if (startDate <= new Date()) {
            return NextResponse.json(
                { error: 'Start date must be in the future' },
                { status: 400 }
            )
        }

        // Validate budget
        if (budget <= 0) {
            return NextResponse.json(
                { error: 'Budget must be greater than 0' },
                { status: 400 }
            )
        }

        // Create ad
        const { data: ad, error } = await supabaseAdmin
            .from('ads')
            .insert({
                user_id,
                title,
                description,
                image: image || null,
                budget,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating ad:', error)
            return NextResponse.json(
                { error: 'Failed to create ad' },
                { status: 500 }
            )
        }

        return NextResponse.json({ ad }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/ads:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get ads
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabaseAdmin
            .from('ads')
            .select(`
        *,
        user:user_id (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (user_id) {
            query = query.eq('user_id', user_id)
        }
        if (status) {
            query = query.eq('status', status)
        }

        const { data: ads, error } = await query

        if (error) {
            console.error('Error fetching ads:', error)
            return NextResponse.json(
                { error: 'Failed to fetch ads' },
                { status: 500 }
            )
        }

        return NextResponse.json({ ads })
    } catch (error) {
        console.error('Error in GET /api/ads:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update ad status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Ad ID and status are required' },
                { status: 400 }
            )
        }

        // Validate status
        if (!['pending', 'active', 'paused', 'completed'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            )
        }

        const { data: ad, error } = await supabaseAdmin
            .from('ads')
            .update({ status })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating ad:', error)
            return NextResponse.json(
                { error: 'Failed to update ad' },
                { status: 500 }
            )
        }

        return NextResponse.json({ ad })
    } catch (error) {
        console.error('Error in PUT /api/ads:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete ad
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Ad ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('ads')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting ad:', error)
            return NextResponse.json(
                { error: 'Failed to delete ad' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Ad deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/ads:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
