import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { BOT_CONFIG } from '@/lib/constants'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


// Create new referral
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { referrer_id, referred_id } = body

        // Validate required fields
        if (!referrer_id || !referred_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if user is trying to refer themselves
        if (referrer_id === referred_id) {
            return NextResponse.json(
                { error: 'Cannot refer yourself' },
                { status: 400 }
            )
        }

        // Check if referral already exists
        const { data: existingReferral } = await supabaseAdmin
            .from('referrals')
            .select('id')
            .eq('referrer_id', referrer_id)
            .eq('referred_id', referred_id)
            .single()

        if (existingReferral) {
            return NextResponse.json(
                { error: 'Referral already exists' },
                { status: 409 }
            )
        }

        // Create referral
        const { data: referral, error } = await supabaseAdmin
            .from('referrals')
            .insert({
                referrer_id,
                referred_id,
                status: 'pending',
                reward_amount: BOT_CONFIG.REFERRAL_REWARD,
                reward_paid: false
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating referral:', error)
            return NextResponse.json(
                { error: 'Failed to create referral' },
                { status: 500 }
            )
        }

        return NextResponse.json({ referral }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/referrals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get referrals
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const type = searchParams.get('type') // 'referrer' or 'referred'
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!user_id || !type) {
            return NextResponse.json(
                { error: 'User ID and type are required' },
                { status: 400 }
            )
        }

        let query = supabaseAdmin
            .from('referrals')
            .select(`
        *,
        referrer:referrer_id (
          id,
          name,
          phone
        ),
        referred:referred_id (
          id,
          name,
          phone
        )
      `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (type === 'referrer') {
            query = query.eq('referrer_id', user_id)
        } else if (type === 'referred') {
            query = query.eq('referred_id', user_id)
        } else {
            return NextResponse.json(
                { error: 'Invalid type. Must be "referrer" or "referred"' },
                { status: 400 }
            )
        }

        const { data: referrals, error } = await query

        if (error) {
            console.error('Error fetching referrals:', error)
            return NextResponse.json(
                { error: 'Failed to fetch referrals' },
                { status: 500 }
            )
        }

        return NextResponse.json({ referrals })
    } catch (error) {
        console.error('Error in GET /api/referrals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update referral status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Referral ID and status are required' },
                { status: 400 }
            )
        }

        // Validate status
        if (!['pending', 'completed', 'cancelled'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            )
        }

        const updateData: any = { status }
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString()
        }

        const { data: referral, error } = await supabaseAdmin
            .from('referrals')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating referral:', error)
            return NextResponse.json(
                { error: 'Failed to update referral' },
                { status: 500 }
            )
        }

        // If completed, add points to referrer
        if (status === 'completed') {
            await supabaseAdmin
                .from('point_transactions')
                .insert({
                    user_id: referral.referrer_id,
                    points: BOT_CONFIG.REFERRAL_REWARD,
                    reason: 'referral_completed'
                })

            // Send notification to referrer
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: referral.referrer_id,
                    type: 'listing',
                    title: 'Referral thành công',
                    message: `Bạn đã nhận được ${BOT_CONFIG.REFERRAL_REWARD} điểm từ referral!`
                })
        }

        return NextResponse.json({ referral })
    } catch (error) {
        console.error('Error in PUT /api/referrals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete referral
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Referral ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('referrals')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting referral:', error)
            return NextResponse.json(
                { error: 'Failed to delete referral' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Referral deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/referrals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
