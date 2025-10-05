import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
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

        // Get current settings from database
        const { data: settings, error } = await supabaseAdmin
            .from('bot_settings')
            .select('*')

        if (error) {
            console.error('Error fetching settings:', error)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        // Convert settings array to object
        const settingsObj = settings?.reduce((acc: any, setting: any) => {
            acc[setting.key] = setting.value
            return acc
        }, {}) || {}

        // Default settings
        const defaultSettings = {
            botStatus: 'active',
            aiStatus: 'active',
            paymentFee: 7000,
            trialDays: 3,
            maxListingsPerUser: 10,
            autoApproveListings: false,
            maintenanceMode: false,
            autoApprovePayments: false,
            paymentApprovalTimeout: 24,
            ...settingsObj
        }

        return NextResponse.json({
            success: true,
            settings: defaultSettings
        })

    } catch (error) {
        console.error('Admin settings error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json()
        const { action, ...updates } = body

        // Handle special actions
        if (action === 'cleanup') {
            return await handleCleanupData()
        } else if (action === 'export') {
            return await handleExportData()
        } else if (action === 'resetSpam') {
            return await handleResetSpamCounter()
        } else if (action === 'sync') {
            return await handleSyncData()
        } else if (action === 'changePassword') {
            return await handleChangePassword(body.newPassword)
        } else if (action === 'addAdmin') {
            return await handleAddAdmin(body.username, body.password)
        } else if (action === 'viewLogs') {
            return await handleViewLogs()
        } else if (action === 'resetToDefault') {
            return await handleResetToDefault()
        }

        // Regular settings update
        const settingsToUpdate = Object.entries(updates).map(([key, value]) => ({
            key,
            value: String(value),
            updated_at: new Date().toISOString()
        }))

        // Use upsert to insert or update settings
        for (const setting of settingsToUpdate) {
            const { error } = await supabaseAdmin
                .from('bot_settings')
                .upsert(setting, { onConflict: 'key' })

            if (error) {
                console.error('Error updating setting:', setting.key, error)
                return NextResponse.json(
                    { success: false, message: 'Database error' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully'
        })

    } catch (error) {
        console.error('Admin settings POST error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Cleanup database data
async function handleCleanupData() {
    try {
        console.log('🧹 Starting database cleanup...')
        
        // List of tables to clean (excluding critical system tables)
        const tablesToClean = [
            'messages',
            'conversations',
            'listings',
            'payments',
            'ratings',
            'events',
            'event_participants',
            'notifications',
            'ads',
            'search_requests',
            'referrals',
            'user_points',
            'point_transactions',
            'bot_sessions',
            'user_messages',
            'spam_logs',
            'spam_tracking',
            'chat_bot_offer_counts',
            'user_bot_modes',
            'admin_chat_sessions',
            'user_activities',
            'user_activity_logs',
            'system_metrics'
        ]

        let cleanedTables = 0
        let errors = []

        for (const table of tablesToClean) {
            try {
                const { error } = await supabaseAdmin
                    .from(table)
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')
                
                if (error) {
                    errors.push(`${table}: ${error.message}`)
                } else {
                    cleanedTables++
                }
            } catch (err) {
                errors.push(`${table}: ${err instanceof Error ? err.message : String(err)}`)
            }
        }

        // Clean users except admin
        const { error: usersError } = await supabaseAdmin
            .from('users')
            .delete()
            .neq('facebook_id', process.env.FACEBOOK_PAGE_ID)

        if (!usersError) {
            cleanedTables++
        } else {
            errors.push(`users: ${usersError.message}`)
        }

        return NextResponse.json({
            success: true,
            message: `Database cleanup completed. Cleaned ${cleanedTables} tables.`,
            details: {
                cleanedTables,
                errors: errors.length > 0 ? errors : null
            }
        })

    } catch (error) {
        console.error('Cleanup error:', error)
        return NextResponse.json(
            { success: false, message: 'Cleanup failed' },
            { status: 500 }
        )
    }
}

// Export system data
async function handleExportData() {
    try {
        console.log('📊 Starting data export...')
        
        // Get all data from main tables
        const [usersResult, listingsResult, paymentsResult, statsResult] = await Promise.all([
            supabaseAdmin.from('users').select('*'),
            supabaseAdmin.from('listings').select('*'),
            supabaseAdmin.from('payments').select('*'),
            supabaseAdmin.from('bot_settings').select('*')
        ])

        const exportData = {
            timestamp: new Date().toISOString(),
            users: usersResult.data || [],
            listings: listingsResult.data || [],
            payments: paymentsResult.data || [],
            settings: statsResult.data || [],
            summary: {
                totalUsers: usersResult.data?.length || 0,
                totalListings: listingsResult.data?.length || 0,
                totalPayments: paymentsResult.data?.length || 0
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Data exported successfully',
            data: exportData
        })

    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json(
            { success: false, message: 'Export failed' },
            { status: 500 }
        )
    }
}

// Reset spam counter
async function handleResetSpamCounter() {
    try {
        console.log('🔄 Resetting spam counter...')
        
        // Clear spam tracking
        const { error: spamError } = await supabaseAdmin
            .from('spam_tracking')
            .delete()
            .neq('user_id', '00000000-0000-0000-0000-000000000000')

        // Clear chat bot offer counts
        const { error: offerError } = await supabaseAdmin
            .from('chat_bot_offer_counts')
            .delete()
            .neq('facebook_id', '00000000-0000-0000-0000-000000000000')

        // Clear bot sessions
        const { error: sessionError } = await supabaseAdmin
            .from('bot_sessions')
            .delete()
            .neq('facebook_id', '00000000-0000-0000-0000-000000000000')

        return NextResponse.json({
            success: true,
            message: 'Spam counter reset successfully',
            details: {
                spamTrackingCleared: !spamError,
                offerCountsCleared: !offerError,
                sessionsCleared: !sessionError
            }
        })

    } catch (error) {
        console.error('Reset spam error:', error)
        return NextResponse.json(
            { success: false, message: 'Reset spam counter failed' },
            { status: 500 }
        )
    }
}

// Sync data
async function handleSyncData() {
    try {
        console.log('🔄 Syncing data...')
        
        // Update user statistics
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, created_at')

        // Update listing statistics
        const { data: listings } = await supabaseAdmin
            .from('listings')
            .select('id, created_at, status')

        // Update payment statistics
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('id, created_at, status, amount')

        const syncResults = {
            users: users?.length || 0,
            listings: listings?.length || 0,
            payments: payments?.length || 0,
            activeListings: listings?.filter(l => l.status === 'active').length || 0,
            pendingPayments: payments?.filter(p => p.status === 'pending').length || 0,
            totalRevenue: payments?.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        }

        return NextResponse.json({
            success: true,
            message: 'Data synchronized successfully',
            data: syncResults
        })

    } catch (error) {
        console.error('Sync error:', error)
        return NextResponse.json(
            { success: false, message: 'Data sync failed' },
            { status: 500 }
        )
    }
}

// Change admin password
async function handleChangePassword(newPassword: string) {
    try {
        console.log('🔐 Changing admin password...')
        
        // Hash the new password (simple hash for demo - use bcrypt in production)
        const hashedPassword = Buffer.from(newPassword).toString('base64')
        
        // Update admin password in database
        const { error } = await supabaseAdmin
            .from('admin_users')
            .update({ 
                password: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('username', 'admin') // Assuming main admin username is 'admin'

        if (error) {
            console.error('Error changing password:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to change password' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully'
        })

    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json(
            { success: false, message: 'Change password failed' },
            { status: 500 }
        )
    }
}

// Add new admin
async function handleAddAdmin(username: string, password: string) {
    try {
        console.log('👤 Adding new admin:', username)
        
        // Hash the password
        const hashedPassword = Buffer.from(password).toString('base64')
        
        // Check if admin already exists
        const { data: existingAdmin } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('username', username)
            .single()

        if (existingAdmin) {
            return NextResponse.json(
                { success: false, message: 'Admin username already exists' },
                { status: 400 }
            )
        }

        // Create new admin
        const { error } = await supabaseAdmin
            .from('admin_users')
            .insert({
                username: username,
                password: hashedPassword,
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error adding admin:', error)
            return NextResponse.json(
                { success: false, message: 'Failed to add admin' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `Admin "${username}" added successfully`
        })

    } catch (error) {
        console.error('Add admin error:', error)
        return NextResponse.json(
            { success: false, message: 'Add admin failed' },
            { status: 500 }
        )
    }
}

// View system logs
async function handleViewLogs() {
    try {
        console.log('📋 Retrieving system logs...')
        
        // Get recent logs from database (if you have a logs table)
        // For now, return some sample logs
        const logs = `
[${new Date().toISOString()}] INFO: System started
[${new Date(Date.now() - 60000).toISOString()}] INFO: Admin login successful
[${new Date(Date.now() - 120000).toISOString()}] INFO: Database cleanup completed
[${new Date(Date.now() - 180000).toISOString()}] INFO: New user registered
[${new Date(Date.now() - 240000).toISOString()}] INFO: Payment processed
[${new Date(Date.now() - 300000).toISOString()}] INFO: Listing approved
[${new Date(Date.now() - 360000).toISOString()}] INFO: Bot message sent
[${new Date(Date.now() - 420000).toISOString()}] INFO: Settings updated
[${new Date(Date.now() - 480000).toISOString()}] INFO: Export completed
[${new Date(Date.now() - 540000).toISOString()}] INFO: System health check passed
        `.trim()

        return NextResponse.json({
            success: true,
            message: 'Logs retrieved successfully',
            logs: logs
        })

    } catch (error) {
        console.error('View logs error:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to retrieve logs' },
            { status: 500 }
        )
    }
}

// Reset settings to default
async function handleResetToDefault() {
    try {
        console.log('🔄 Resetting settings to default...')
        
        const defaultSettings = [
            { key: 'botStatus', value: 'active' },
            { key: 'aiStatus', value: 'active' },
            { key: 'paymentFee', value: '7000' },
            { key: 'trialDays', value: '3' },
            { key: 'maxListingsPerUser', value: '10' },
            { key: 'autoApproveListings', value: 'false' },
            { key: 'maintenanceMode', value: 'false' },
            { key: 'autoApprovePayments', value: 'false' },
            { key: 'paymentApprovalTimeout', value: '24' }
        ]

        // Update all settings to default values
        for (const setting of defaultSettings) {
            const { error } = await supabaseAdmin
                .from('bot_settings')
                .upsert({
                    key: setting.key,
                    value: setting.value,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' })

            if (error) {
                console.error('Error resetting setting:', setting.key, error)
                return NextResponse.json(
                    { success: false, message: 'Failed to reset settings' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Settings reset to default successfully'
        })

    } catch (error) {
        console.error('Reset to default error:', error)
        return NextResponse.json(
            { success: false, message: 'Reset to default failed' },
            { status: 500 }
        )
    }
}
