import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { formatCurrency, formatNumber } from '@/lib/formatters'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// Create new listing
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            user_id,
            type,
            category,
            subcategory,
            title,
            price,
            description,
            images,
            location
        } = body

        // Validate required fields
        if (!user_id || !type || !category || !subcategory || !title || !price || !description || !location) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate type
        if (!['product', 'service'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid type. Must be "product" or "service"' },
                { status: 400 }
            )
        }

        // Validate price
        if (price <= 0) {
            return NextResponse.json(
                { error: 'Price must be greater than 0' },
                { status: 400 }
            )
        }

        // Create listing
        const { data: listing, error } = await supabaseAdmin
            .from('listings')
            .insert({
                user_id,
                type,
                category,
                subcategory,
                title,
                price,
                description,
                images: images || [],
                location,
                status: 'active'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating listing:', error)
            return NextResponse.json(
                { error: 'Failed to create listing' },
                { status: 500 }
            )
        }

        // Add points for creating listing
        await supabaseAdmin
            .from('point_transactions')
            .insert({
                user_id,
                points: 10,
                reason: 'create_listing'
            })

        return NextResponse.json({ listing }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/listings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get listings with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const subcategory = searchParams.get('subcategory')
        const location = searchParams.get('location')
        const minPrice = searchParams.get('min_price')
        const maxPrice = searchParams.get('max_price')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabaseAdmin
            .from('listings')
            .select(`
        *,
        users:user_id (
          id,
          name,
          rating,
          location
        )
      `)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply filters
        if (category) {
            query = query.eq('category', category)
        }
        if (subcategory) {
            query = query.eq('subcategory', subcategory)
        }
        if (location) {
            query = query.ilike('location', `%${location}%`)
        }
        if (minPrice) {
            query = query.gte('price', parseInt(minPrice))
        }
        if (maxPrice) {
            query = query.lte('price', parseInt(maxPrice))
        }

        const { data: listings, error } = await query

        if (error) {
            console.error('Error fetching listings:', error)
            return NextResponse.json(
                { error: 'Failed to fetch listings' },
                { status: 500 }
            )
        }

        // Format listings for display
        const formattedListings = listings?.filter(listing =>
            listing.title &&
            listing.price != null &&
            listing.location &&
            typeof listing.price === 'number' &&
            !isNaN(listing.price)
        ).map(listing => ({
            ...listing,
            formatted_price: formatCurrency(listing.price),
            time_ago: getTimeAgo(listing.created_at)
        })) || []

        return NextResponse.json({ listings: formattedListings })
    } catch (error) {
        console.error('Error in GET /api/listings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update listing
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Listing ID is required' },
                { status: 400 }
            )
        }

        const { data: listing, error } = await supabaseAdmin
            .from('listings')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating listing:', error)
            return NextResponse.json(
                { error: 'Failed to update listing' },
                { status: 500 }
            )
        }

        return NextResponse.json({ listing })
    } catch (error) {
        console.error('Error in PUT /api/listings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete listing
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Listing ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('listings')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting listing:', error)
            return NextResponse.json(
                { error: 'Failed to delete listing' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Listing deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/listings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to get time ago
function getTimeAgo(date: string): string {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Vừa xong'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`
}
