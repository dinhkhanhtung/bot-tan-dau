import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Check if admin user already exists
        const { data: existingAdmin } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('username', process.env.ADMIN_USERNAME)
            .single()

        if (existingAdmin) {
            return NextResponse.json({
                success: true,
                message: 'Admin user already exists',
                admin: existingAdmin
            })
        }

        // Create admin user from environment variables
        const envUsername = process.env.ADMIN_USERNAME
        const envPassword = process.env.ADMIN_PASSWORD
        const envName = process.env.ADMIN_NAME || 'Administrator'
        const envEmail = process.env.ADMIN_EMAIL || 'admin@example.com'

        if (!envUsername || !envPassword) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required'
                },
                { status: 400 }
            )
        }

        const salt = 'bot_tan_dau_admin_salt_2024'
        const passwordHash = crypto.createHash('sha256').update(envPassword + salt).digest('hex')

        const { data: newAdminUser, error: createError } = await supabaseAdmin
            .from('admin_users')
            .insert({
                username: envUsername,
                password_hash: passwordHash,
                name: envName,
                email: envEmail,
                role: 'super_admin',
                permissions: JSON.stringify(['all']),
                is_active: true,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating admin user:', createError)
            return NextResponse.json(
                {
                    success: false,
                    message: 'Failed to create admin user',
                    error: createError.message
                },
                { status: 500 }
            )
        }

        console.log('Admin user created successfully during setup:', newAdminUser.username)

        return NextResponse.json({
            success: true,
            message: 'Admin user created successfully',
            admin: {
                id: newAdminUser.id,
                username: newAdminUser.username,
                name: newAdminUser.name,
                role: newAdminUser.role
            }
        })

    } catch (error) {
        console.error('Admin setup error:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error during admin setup',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}
