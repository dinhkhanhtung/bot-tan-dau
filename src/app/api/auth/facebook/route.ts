import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const { accessToken, userInfo } = await request.json()

        if (!accessToken || !userInfo) {
            return NextResponse.json(
                { error: 'Thiếu thông tin đăng nhập' },
                { status: 400 }
            )
        }

        // Verify age (must be born in 1981)
        if (userInfo.birthday) {
            const birthYear = new Date(userInfo.birthday).getFullYear()
            if (birthYear !== 1981) {
                return NextResponse.json(
                    { error: 'Chỉ dành cho thành viên sinh năm 1981' },
                    { status: 403 }
                )
            }
        } else {
            return NextResponse.json(
                { error: 'Không thể xác minh năm sinh. Vui lòng cập nhật thông tin trên Facebook' },
                { status: 400 }
            )
        }

        const supabase = createClient()

        // Create or update user in database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert({
                facebook_id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                birthday: userInfo.birthday,
                avatar_url: userInfo.picture?.data?.url,
                status: 'trial',
                membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
                referral_code: `TD1981-${userInfo.id.slice(-6).toUpperCase()}`,
            })
            .select()
            .single()

        if (userError) {
            console.error('Database error:', userError)
            return NextResponse.json(
                { error: 'Lỗi cơ sở dữ liệu' },
                { status: 500 }
            )
        }

        // Create user analytics record
        await supabase
            .from('user_analytics')
            .upsert({
                user_id: userData.id,
                total_listings: 0,
                total_connections: 0,
                response_rate: 0,
                avg_response_time: 0,
                conversion_rate: 0,
                revenue_generated: 0,
                last_activity: new Date().toISOString(),
            })

        // Create user points record
        await supabase
            .from('user_points')
            .upsert({
                user_id: userData.id,
                points: 0,
                level: 1,
                total_earned: 0,
                last_activity: new Date().toISOString(),
            })

        // Create user astrology record
        await supabase
            .from('user_astrology')
            .upsert({
                user_id: userData.id,
                chinese_zodiac: 'Tân Dậu',
                element: 'Kim',
                lucky_numbers: [1, 6, 8, 9],
                lucky_colors: ['Vàng', 'Trắng', 'Xanh dương'],
            })

        // Add New Member achievement
        await supabase
            .from('user_achievements')
            .insert({
                user_id: userData.id,
                achievement_type: 'New Member',
            })

        return NextResponse.json({
            success: true,
            user: userData,
            message: 'Đăng nhập thành công!'
        })

    } catch (error) {
        console.error('Facebook login error:', error)
        return NextResponse.json(
            { error: 'Lỗi đăng nhập Facebook' },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Facebook Auth API endpoint'
    })
}
