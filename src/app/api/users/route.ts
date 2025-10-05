import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReferralCode, validatePhoneNumber } from '@/lib/utils'

// Create new user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { facebook_id, name, phone, location, birthday } = body

        // Validate required fields
        if (!facebook_id || !name || !phone || !location || birthday !== 1981) {
            return NextResponse.json(
                { error: 'Missing required fields or invalid birthday' },
                { status: 400 }
            )
        }

        // Validate phone number
        if (!validatePhoneNumber(phone)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('facebook_id', facebook_id)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 409 }
            )
        }

        // Check if phone number is already used
        const { data: existingPhone } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', phone)
            .single()

        if (existingPhone) {
            return NextResponse.json(
                { error: 'Phone number already registered' },
                { status: 409 }
            )
        }

        // Generate referral code
        const referralCode = generateReferralCode(facebook_id)

        // Calculate trial expiry date
        const trialExpiry = new Date()
        trialExpiry.setDate(trialExpiry.getDate() + 3) // 3 days trial

        // Create user
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .insert({
                facebook_id,
                name,
                phone,
                location,
                birthday,
                status: 'trial',
                membership_expires_at: trialExpiry.toISOString(),
                referral_code: referralCode
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating user:', error)
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            )
        }

        // Create user points record
        await supabaseAdmin
            .from('user_points')
            .insert({
                user_id: user.id,
                points: 0,
                level: 'Đồng'
            })

        // Create bot session
        await supabaseAdmin
            .from('bot_sessions')
            .insert({
                facebook_id: user.facebook_id,
                session_data: {},
                current_flow: 'registration',
                current_step: 0
            })

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/users:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get user by Facebook ID
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const facebook_id = searchParams.get('facebook_id')

        if (!facebook_id) {
            return NextResponse.json(
                { error: 'Facebook ID is required' },
                { status: 400 }
            )
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', facebook_id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                )
            }
            throw error
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Error in GET /api/users:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Update user
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { facebook_id, ...updateData } = body

        if (!facebook_id) {
            return NextResponse.json(
                { error: 'Facebook ID is required' },
                { status: 400 }
            )
        }

        // Validate phone number if provided
        if (updateData.phone && !validatePhoneNumber(updateData.phone)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            )
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('facebook_id', facebook_id)
            .select()
            .single()

        if (error) {
            console.error('Error updating user:', error)
            return NextResponse.json(
                { error: 'Failed to update user' },
                { status: 500 }
            )
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Error in PUT /api/users:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Delete user
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const facebook_id = searchParams.get('facebook_id')

        if (!facebook_id) {
            return NextResponse.json(
                { error: 'Facebook ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('facebook_id', facebook_id)

        if (error) {
            console.error('Error deleting user:', error)
            return NextResponse.json(
                { error: 'Failed to delete user' },
                { status: 500 }
            )
        }

        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Error in DELETE /api/users:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
