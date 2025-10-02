import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { BOT_CONFIG } from '@/lib/constants'

// Create new payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, amount, receipt_image } = body

        // Validate required fields
        if (!user_id || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate amount
        if (amount < BOT_CONFIG.DAILY_FEE * BOT_CONFIG.MINIMUM_DAYS) {
            return NextResponse.json(
                { error: `Minimum payment amount is ${BOT_CONFIG.DAILY_FEE * BOT_CONFIG.MINIMUM_DAYS} VND` },
                { status: 400 }
            )
        }

        // Create payment
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id,
                amount,
                receipt_image: receipt_image || null,
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating payment:', error)
            return NextResponse.json(
                { error: 'Failed to create payment' },
                { status: 500 }
            )
        }

        return NextResponse.json({ payment }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/payments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get payments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const user_id = searchParams.get('user_id')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabaseAdmin
            .from('payments')
            .select(`
        *,
        users:user_id (
          id,
          name,
          phone
        )
      `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply filters
        if (user_id) {
            query = query.eq('user_id', user_id)
        }
        if (status) {
            query = query.eq('status', status)
        }

        const { data: payments, error } = await query

        if (error) {
            console.error('Error fetching payments:', error)
            return NextResponse.json(
                { error: 'Failed to fetch payments' },
                { status: 500 }
            )
        }

        return NextResponse.json({ payments })
    } catch (error) {
        console.error('Error in GET /api/payments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update payment status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, admin_notes } = body

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Payment ID and status are required' },
                { status: 400 }
            )
        }

        // Validate status
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be "pending", "approved", or "rejected"' },
                { status: 400 }
            )
        }

        const updateData: any = {
            status,
            updated_at: new Date().toISOString()
        }

        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString()
        }

        if (admin_notes) {
            updateData.admin_notes = admin_notes
        }

        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating payment:', error)
            return NextResponse.json(
                { error: 'Failed to update payment' },
                { status: 500 }
            )
        }

        // If payment is approved, extend user membership
        if (status === 'approved') {
            await extendUserMembership(payment.user_id, payment.amount)
        }

        return NextResponse.json({ payment })
    } catch (error) {
        console.error('Error in PUT /api/payments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete payment
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Payment ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('payments')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting payment:', error)
            return NextResponse.json(
                { error: 'Failed to delete payment' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'Payment deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/payments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to extend user membership
async function extendUserMembership(userId: string, amount: number) {
    try {
        // Calculate days to extend based on amount
        const daysToExtend = Math.floor(amount / BOT_CONFIG.DAILY_FEE)

        // Get current user
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('membership_expires_at')
            .eq('id', userId)
            .single()

        if (userError) {
            console.error('Error getting user:', userError)
            return
        }

        // Calculate new expiry date
        let newExpiryDate: Date
        if (user.membership_expires_at) {
            newExpiryDate = new Date(user.membership_expires_at)
        } else {
            newExpiryDate = new Date()
        }

        newExpiryDate.setDate(newExpiryDate.getDate() + daysToExtend)

        // Update user membership
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                status: 'active',
                membership_expires_at: newExpiryDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating user membership:', updateError)
        }

        // Send notification to user
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'payment',
                title: 'Thanh toán đã được duyệt',
                message: `Tài khoản của bạn đã được gia hạn thêm ${daysToExtend} ngày. Cảm ơn bạn đã tin tưởng BOT Tân Dậu - Hỗ Trợ Chéo!`
            })

    } catch (error) {
        console.error('Error extending user membership:', error)
    }
}
