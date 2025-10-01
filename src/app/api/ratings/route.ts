import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Create new rating
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { reviewer_id, reviewee_id, rating, comment } = body

        // Validate required fields
        if (!reviewer_id || !reviewee_id || !rating) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            )
        }

        // Check if user is trying to rate themselves
        if (reviewer_id === reviewee_id) {
            return NextResponse.json(
                { error: 'Cannot rate yourself' },
                { status: 400 }
            )
        }

        // Check if rating already exists
        const { data: existingRating } = await supabaseAdmin
            .from('ratings')
            .select('id')
            .eq('reviewer_id', reviewer_id)
            .eq('reviewee_id', reviewee_id)
            .single()

        if (existingRating) {
            return NextResponse.json(
                { error: 'Rating already exists' },
                { status: 409 }
            )
        }

        // Create rating
        const { data: ratingData, error } = await supabaseAdmin
            .from('ratings')
            .insert({
                reviewer_id,
                reviewee_id,
                rating,
                comment: comment || null
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating rating:', error)
            return NextResponse.json(
                { error: 'Failed to create rating' },
                { status: 500 }
            )
        }

        // Add points for giving rating
        await supabaseAdmin
            .from('point_transactions')
            .insert({
                user_id: reviewer_id,
                points: 5,
                reason: 'give_rating'
            })

        // Add points for receiving rating
        await supabaseAdmin
            .from('point_transactions')
            .insert({
                user_id: reviewee_id,
                points: 5,
                reason: 'receive_rating'
            })

        // Send notification to reviewee
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: reviewee_id,
                type: 'listing',
                title: 'Nhận đánh giá mới',
                message: `Bạn vừa nhận được đánh giá ${rating} sao!`
            })

        return NextResponse.json({ rating: ratingData }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/ratings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get ratings for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!user_id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        const { data: ratings, error } = await supabaseAdmin
            .from('ratings')
            .select(`
        *,
        reviewer:reviewer_id (
          id,
          name
        )
      `)
            .eq('reviewee_id', user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching ratings:', error)
            return NextResponse.json(
                { error: 'Failed to fetch ratings' },
                { status: 500 }
            )
        }

        // Calculate average rating
        const { data: avgRating } = await supabaseAdmin
            .from('ratings')
            .select('rating')
            .eq('reviewee_id', user_id)

        const averageRating = avgRating && avgRating.length > 0
            ? avgRating.reduce((sum: number, r: any) => sum + r.rating, 0) / avgRating.length
            : 0

        return NextResponse.json({
            ratings,
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings: avgRating?.length || 0
        })
    } catch (error) {
        console.error('Error in GET /api/ratings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update rating
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, rating, comment } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Rating ID is required' },
                { status: 400 }
            )
        }

        // Validate rating
        if (rating && (rating < 1 || rating > 5)) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            )
        }

        const updateData: any = {}
        if (rating !== undefined) updateData.rating = rating
        if (comment !== undefined) updateData.comment = comment

        const { data: ratingData, error } = await supabaseAdmin
            .from('ratings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating rating:', error)
            return NextResponse.json(
                { error: 'Failed to update rating' },
                { status: 500 }
            )
        }

        return NextResponse.json({ rating: ratingData })
    } catch (error) {
        console.error('Error in PUT /api/ratings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete rating
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Rating ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('ratings')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting rating:', error)
            return NextResponse.json(
                { error: 'Failed to delete rating' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Rating deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/ratings:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
