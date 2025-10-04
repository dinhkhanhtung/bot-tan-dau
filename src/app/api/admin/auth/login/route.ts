import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json()

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Vui lòng nhập đầy đủ thông tin' },
                { status: 400 }
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
                { status: 401 }
            )
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash)

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' },
                { status: 401 }
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

        // Update last login
        await supabaseAdmin
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', adminUser.id)

        // Return success response
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
        })

    } catch (error) {
        console.error('Admin login error:', error)
        return NextResponse.json(
            { success: false, message: 'Có lỗi xảy ra khi đăng nhập' },
            { status: 500 }
        )
    }
}
