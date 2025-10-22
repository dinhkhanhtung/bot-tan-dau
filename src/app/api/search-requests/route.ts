import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { BOT_CONFIG } from '@/lib/constants'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// Create new search request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            user_id,
            search_query,
            category,
            location,
            budget_range,
            priority
        } = body

        // Validate required fields
        if (!user_id || !search_query || !category || !location || !budget_range || !priority) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate priority
        if (!['low', 'medium', 'high'].includes(priority)) {
            return NextResponse.json(
                { error: 'Invalid priority' },
                { status: 400 }
            )
        }

        // Create search request
        const { data: searchRequest, error } = await supabaseAdmin
            .from('search_requests')
            .insert({
                user_id,
                search_query,
                category,
                location,
                budget_range,
                priority,
                price: BOT_CONFIG.SEARCH_SERVICE_FEE,
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating search request:', error)
            return NextResponse.json(
                { error: 'Failed to create search request' },
                { status: 500 }
            )
        }

        // Send notification to admin
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: 'admin', // Admin user ID
                type: 'ai_suggestion',
                title: 'Yêu cầu tìm kiếm mới',
                message: `Có yêu cầu tìm kiếm mới: ${search_query}`
            })

        return NextResponse.json({ searchRequest }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/search-requests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get search requests
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabaseAdmin
            .from('search_requests')
            .select(`
        *,
        user:user_id (
          id,
          name,
          phone
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

        const { data: searchRequests, error } = await query

        if (error) {
            console.error('Error fetching search requests:', error)
            return NextResponse.json(
                { error: 'Failed to fetch search requests' },
                { status: 500 }
            )
        }

        return NextResponse.json({ searchRequests })
    } catch (error) {
        console.error('Error in GET /api/search-requests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update search request status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, results } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Search request ID and status are required' },
                { status: 400 }
            )
        }

        // Validate status
        if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            )
        }

        const updateData: any = { status }
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString()
        }

        const { data: searchRequest, error } = await supabaseAdmin
            .from('search_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating search request:', error)
            return NextResponse.json(
                { error: 'Failed to update search request' },
                { status: 500 }
            )
        }

        // If completed, send results to user
        if (status === 'completed' && results) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: searchRequest.user_id,
                    type: 'ai_suggestion',
                    title: 'Kết quả tìm kiếm hộ',
                    message: `Kết quả tìm kiếm cho "${searchRequest.search_query}" đã sẵn sàng!`
                })
        }

        return NextResponse.json({ searchRequest })
    } catch (error) {
        console.error('Error in PUT /api/search-requests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete search request
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Search request ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('search_requests')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting search request:', error)
            return NextResponse.json(
                { error: 'Failed to delete search request' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Search request deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/search-requests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
