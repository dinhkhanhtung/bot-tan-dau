import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        console.log('🔧 Setting up admin user from Vercel environment...')

        // Get admin info from environment variables
        const adminUsername = process.env.ADMIN_USERNAME
        const adminPassword = process.env.ADMIN_PASSWORD
        const adminName = process.env.ADMIN_NAME
        const adminEmail = process.env.ADMIN_EMAIL

        if (!adminUsername || !adminPassword || !adminName || !adminEmail) {
            return NextResponse.json(
                { success: false, message: 'Missing admin environment variables' },
                { status: 400 }
            )
        }

        // Create hash for password
        const salt = 'bot_tan_dau_admin_salt_2024'
        const passwordHash = crypto.createHash('sha256').update(adminPassword + salt).digest('hex')

        // Delete existing admin first
        const { error: deleteError } = await supabaseAdmin
            .from('admin_users')
            .delete()
            .eq('username', adminUsername)

        if (deleteError) {
            console.log('⚠️ Could not delete existing admin or admin does not exist:', deleteError.message)
        } else {
            console.log('✅ Successfully deleted existing admin')
        }

        // Create new admin user
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .insert({
                username: adminUsername,
                password_hash: passwordHash,
                name: adminName,
                email: adminEmail,
                role: 'super_admin',
                permissions: { all: true },
                is_active: true
            })
            .select()

        if (error) {
            console.error('❌ Error creating admin:', error)
            return NextResponse.json(
                { success: false, message: `Failed to create admin: ${error.message}` },
                { status: 500 }
            )
        }

        console.log('✅ Admin created successfully!')

        return NextResponse.json({
            success: true,
            message: 'Admin setup completed successfully',
            admin: {
                username: adminUsername,
                name: adminName,
                email: adminEmail,
                role: 'super_admin'
            }
        })

    } catch (error) {
        console.error('Admin setup error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
