import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'


export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const paymentId = params.id

        if (!paymentId) {
            return NextResponse.json(
                { success: false, message: 'Payment ID is required' },
                { status: 400 }
            )
        }

        // Get payment details
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single()

        if (paymentError || !payment) {
            return NextResponse.json(
                { success: false, message: 'Payment not found' },
                { status: 404 }
            )
        }

        if (payment.status !== 'pending') {
            return NextResponse.json(
                { success: false, message: 'Payment is not pending' },
                { status: 400 }
            )
        }

        // Update payment status
        const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', paymentId)

        if (updateError) {
            console.error('Error approving payment:', updateError)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        // Update user membership (7 days for 7000đ)
        const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({
                membership_expires_at: newExpiryDate.toISOString(),
                status: 'registered'
            })
            .eq('facebook_id', payment.user_id)

        if (userError) {
            console.error('Error updating user membership:', userError)
        }

        return NextResponse.json({
            success: true,
            message: 'Payment approved successfully'
        })

    } catch (error) {
        console.error('Admin approve payment error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
