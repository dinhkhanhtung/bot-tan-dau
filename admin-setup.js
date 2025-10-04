#!/usr/bin/env node

/**
 * Admin Setup Script for BOT Tân Dậu
 * Cập nhật cấu hình admin và test chức năng
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAdmin() {
    console.log('🔧 Setting up admin configuration...')

    try {
        // 1. Check current admin configuration
        console.log('\n📋 Current Admin Configuration:')
        console.log(`FACEBOOK_PAGE_ID: ${process.env.FACEBOOK_PAGE_ID}`)
        console.log(`ENABLE_PERSONAL_ADMINS: ${process.env.ENABLE_PERSONAL_ADMINS}`)

        // 2. Check admin_users table
        const { data: adminUsers, error: adminError } = await supabase
            .from('admin_users')
            .select('*')

        if (adminError) {
            console.error('❌ Error fetching admin users:', adminError)
            return
        }

        console.log(`\n👥 Admin Users in Database: ${adminUsers.length}`)
        adminUsers.forEach(admin => {
            console.log(`  - ${admin.name} (${admin.facebook_id}) - ${admin.is_active ? 'Active' : 'Inactive'}`)
        })

        // 3. Test admin detection
        console.log('\n🧪 Testing Admin Detection:')

        // Test fanpage admin
        const isFanpageAdmin = process.env.FACEBOOK_PAGE_ID === process.env.FACEBOOK_PAGE_ID
        console.log(`  Fanpage Admin (${process.env.FACEBOOK_PAGE_ID}): ${isFanpageAdmin ? '✅' : '❌'}`)

        // Test personal admin if enabled
        if (process.env.ENABLE_PERSONAL_ADMINS === 'true') {
            for (const admin of adminUsers) {
                if (admin.is_active) {
                    console.log(`  Personal Admin (${admin.facebook_id}): ✅`)
                }
            }
        } else {
            console.log('  Personal Admins: Disabled')
        }

        // 4. Add sample admin user if needed
        if (adminUsers.length === 0 && process.env.ENABLE_PERSONAL_ADMINS === 'true') {
            console.log('\n➕ Adding sample admin user...')

            const { data: newAdmin, error: insertError } = await supabase
                .from('admin_users')
                .insert({
                    facebook_id: '1234567890123456', // Sample ID
                    name: 'Sample Admin',
                    role: 'admin',
                    permissions: { all: true },
                    is_active: true
                })
                .select()

            if (insertError) {
                console.error('❌ Error adding sample admin:', insertError)
            } else {
                console.log('✅ Sample admin added:', newAdmin[0])
            }
        }

        // 5. Update bot settings
        console.log('\n⚙️ Updating bot settings...')
        
        const { error: settingsError } = await supabase
            .from('bot_settings')
            .upsert({
                key: 'admin_config',
                value: JSON.stringify({
                    fanpage_admin_enabled: true,
                    personal_admins_enabled: process.env.ENABLE_PERSONAL_ADMINS === 'true',
                    fanpage_id: process.env.FACEBOOK_PAGE_ID
                }),
                description: 'Admin configuration settings'
            }, {
                onConflict: 'key'
            })

        if (settingsError) {
            console.error('❌ Error updating bot settings:', settingsError)
        } else {
            console.log('✅ Bot settings updated')
        }

        console.log('\n🎉 Admin setup completed successfully!')
        console.log('\n📝 Next steps:')
        console.log('1. Test admin functionality by sending a message from the fanpage')
        console.log('2. If you want to add personal admins, set ENABLE_PERSONAL_ADMINS=true')
        console.log('3. Add admin users to the admin_users table in Supabase')

    } catch (error) {
        console.error('❌ Error in admin setup:', error)
    }
}

// Run the setup
setupAdmin()
