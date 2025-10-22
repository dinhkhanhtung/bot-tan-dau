import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json()

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Vui lòng nhập đầy đủ thông tin' },
                { 
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }
                }
            )
        }

        // Get admin user from database
        const { data: adminUser, error } = await supabaseAdmin
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single()

        if (error || !adminUser) {
            return NextResponse.json(
                { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
                { 
                    status: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }
                }
            )
        }

        // Verify password (sử dụng cùng phương thức hash như script tạo admin)
        const salt = 'bot_tan_dau_admin_salt_2024'
        const expectedHash = crypto.createHash('sha256').update(password + salt).digest('hex')
        const isPasswordValid = expectedHash === adminUser.password_hash

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
                {
                    status: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }
                }
            )
        }

        // Create JWT token
        const token = jwt.sign(
            {
                adminId: adminUser.id,
                username: adminUser.username,
                role: adminUser.role,
                permissions: adminUser.permissions
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
            { expiresIn: '24h' }
        )

        console.log('JWT token created successfully for admin:', adminUser.username)

        // Update last login
        await supabaseAdmin
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', adminUser.id)

        // Return success response with CORS headers
        return NextResponse.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            admin: {
                id: adminUser.id,
                username: adminUser.username,
                name: adminUser.name,
                role: adminUser.role,
                permissions: adminUser.permissions
            }
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })

    } catch (error) {
        console.error('Admin login error:', error)
        return NextResponse.json(
            { success: false, message: 'Có lỗi xảy ra khi đăng nhập' },
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        )
    }
}
