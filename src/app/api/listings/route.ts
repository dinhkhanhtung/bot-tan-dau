import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const type = searchParams.get('type')
        const category = searchParams.get('category')
        const location = searchParams.get('location')
        const price_min = searchParams.get('price_min')
        const price_max = searchParams.get('price_max')
        const search = searchParams.get('search')
        const sort_by = searchParams.get('sort_by') || 'newest'
        const user_id = searchParams.get('user_id')

        const supabase = createClient()
        let query = supabase
            .from('listings')
            .select(`
        *,
        user:users(id, name, avatar_url, rating, location),
        product_listings(*),
        service_listings(*)
      `, { count: 'exact' })

        // Apply filters
        if (type) {
            query = query.eq('type', type)
        }
        if (category) {
            query = query.eq('category', category)
        }
        if (location) {
            query = query.eq('user.location', location)
        }
        if (price_min) {
            query = query.gte('price', parseFloat(price_min))
        }
        if (price_max) {
            query = query.lte('price', parseFloat(price_max))
        }
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }
        if (user_id) {
            query = query.eq('user_id', user_id)
        }

        // Only show active listings
        query = query.eq('status', 'active')

        // Apply sorting
        switch (sort_by) {
            case 'newest':
                query = query.order('created_at', { ascending: false })
                break
            case 'oldest':
                query = query.order('created_at', { ascending: true })
                break
            case 'price_low':
                query = query.order('price', { ascending: true })
                break
            case 'price_high':
                query = query.order('price', { ascending: false })
                break
            case 'rating':
                query = query.order('user.rating', { ascending: false })
                break
            default:
                query = query.order('created_at', { ascending: false })
        }

        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data: listings, error, count } = await query
            .range(from, to)

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi cơ sở dữ liệu' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: listings,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
                has_next: page * limit < (count || 0),
                has_prev: page > 1,
            }
        })

    } catch (error) {
        console.error('Listings API error:', error)
        return NextResponse.json(
            { error: 'Lỗi server' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const listingData = await request.json()

        const supabase = createClient()

        // Create main listing
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
                user_id: listingData.user_id,
                type: listingData.type,
                category: listingData.category,
                title: listingData.title,
                price: listingData.price,
                description: listingData.description,
                images: listingData.images || [],
                status: 'active',
            })
            .select()
            .single()

        if (listingError) {
            console.error('Database error:', listingError)
            return NextResponse.json(
                { error: 'Lỗi tạo tin đăng' },
                { status: 500 }
            )
        }

        // Create type-specific data
        if (listingData.type === 'product' && listingData.product_data) {
            const { error: productError } = await supabase
                .from('product_listings')
                .insert({
                    listing_id: listing.id,
                    ...listingData.product_data
                })

            if (productError) {
                console.error('Product data error:', productError)
                // Continue without failing the main listing
            }
        }

        if (listingData.type === 'service' && listingData.service_data) {
            const { error: serviceError } = await supabase
                .from('service_listings')
                .insert({
                    listing_id: listing.id,
                    ...listingData.service_data
                })

            if (serviceError) {
                console.error('Service data error:', serviceError)
                // Continue without failing the main listing
            }
        }

        // Update user analytics
        await supabase
            .from('user_analytics')
            .upsert({
                user_id: listingData.user_id,
                total_listings: 1,
                last_activity: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
                ignoreDuplicates: false
            })

        // Add points for creating listing
        await supabase
            .from('point_transactions')
            .insert({
                user_id: listingData.user_id,
                points: 10,
                type: 'earn',
                reason: 'listing_created'
            })

        return NextResponse.json({
            success: true,
            data: listing,
            message: 'Tạo tin đăng thành công'
        })

    } catch (error) {
        console.error('Create listing error:', error)
        return NextResponse.json(
            { error: 'Lỗi tạo tin đăng' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, ...updateData } = await request.json()

        if (!id) {
            return NextResponse.json(
                { error: 'Thiếu ID tin đăng' },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { data: listing, error } = await supabase
            .from('listings')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi cập nhật tin đăng' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: listing,
            message: 'Cập nhật tin đăng thành công'
        })

    } catch (error) {
        console.error('Update listing error:', error)
        return NextResponse.json(
            { error: 'Lỗi cập nhật tin đăng' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Thiếu ID tin đăng' },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Lỗi xóa tin đăng' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Xóa tin đăng thành công'
        })

    } catch (error) {
        console.error('Delete listing error:', error)
        return NextResponse.json(
            { error: 'Lỗi xóa tin đăng' },
            { status: 500 }
        )
    }
}
