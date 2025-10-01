import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReferralCode } from '@/lib/utils'

// Handle Facebook authentication and user creation
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

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', facebook_id)
            .single()

        if (existingUser) {
            return NextResponse.json({
                user: existingUser,
                isNewUser: false
            })
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
                user_id: user.id,
                session_data: {},
                current_flow: 'registration',
                current_step: 0
            })

        // Send welcome notification
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: user.id,
                type: 'listing',
                title: 'Chào mừng đến với BOT TÂN DẬU 1981!',
                message: 'Bạn đã đăng ký thành công. Chúc mừng bạn đã gia nhập cộng đồng Tân Dậu 1981!'
            })

        return NextResponse.json({
            user,
            isNewUser: true
        })
    } catch (error) {
        console.error('Error in POST /api/auth/facebook:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
