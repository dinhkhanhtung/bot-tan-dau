#!/usr/bin/env node

/**
 * Test Admin Functionality
 * Kiểm tra chức năng admin đã hoạt động chưa
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

async function testAdmin() {
    console.log('🧪 Testing Admin Configuration...\n')

    // 1. Check environment variables
    console.log('📋 Environment Variables:')
    console.log(`  FACEBOOK_PAGE_ID: ${process.env.FACEBOOK_PAGE_ID || '❌ NOT SET'}`)
    console.log(`  ENABLE_PERSONAL_ADMINS: ${process.env.ENABLE_PERSONAL_ADMINS || '❌ NOT SET'}`)
    console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`)
    console.log(`  SUPABASE_KEY: ${supabaseKey ? '✅ SET' : '❌ NOT SET'}`)

    // 2. Test database connection
    console.log('\n🔌 Database Connection:')
    try {
        const { data, error } = await supabase
            .from('bot_settings')
            .select('key, value')
            .limit(1)

        if (error) {
            console.log(`  ❌ Database Error: ${error.message}`)
        } else {
            console.log('  ✅ Database connected successfully')
        }
    } catch (err) {
        console.log(`  ❌ Connection Error: ${err.message}`)
    }

    // 3. Test admin detection logic
    console.log('\n🔍 Admin Detection Logic:')
    
    // Test fanpage admin
    const fanpageId = process.env.FACEBOOK_PAGE_ID
    if (fanpageId) {
        console.log(`  Fanpage Admin (${fanpageId}): ✅ ENABLED`)
    } else {
        console.log('  Fanpage Admin: ❌ DISABLED (FACEBOOK_PAGE_ID not set)')
    }

    // Test personal admins
    const enablePersonal = process.env.ENABLE_PERSONAL_ADMINS === 'true'
    if (enablePersonal) {
        console.log('  Personal Admins: ✅ ENABLED')
        
        // Check admin users in database
        const { data: adminUsers } = await supabase
            .from('admin_users')
            .select('facebook_id, name, is_active')
            .eq('is_active', true)

        console.log(`    Active Admin Users: ${adminUsers?.length || 0}`)
        adminUsers?.forEach(admin => {
            console.log(`      - ${admin.name} (${admin.facebook_id})`)
        })
    } else {
        console.log('  Personal Admins: ❌ DISABLED')
    }

    // 4. Summary
    console.log('\n📊 Summary:')
    if (fanpageId) {
        console.log('  ✅ Admin fanpage is configured and ready')
        console.log('  📱 Send a message from your Facebook page to test')
    } else {
        console.log('  ❌ Admin fanpage is NOT configured')
        console.log('  🔧 Set FACEBOOK_PAGE_ID in Vercel environment variables')
    }

    if (enablePersonal) {
        console.log('  ✅ Personal admins are enabled')
    } else {
        console.log('  ℹ️  Personal admins are disabled (optional)')
    }

    console.log('\n🎯 Next Steps:')
    console.log('1. Deploy to Vercel with updated environment variables')
    console.log('2. Send a message from your Facebook page')
    console.log('3. You should see admin dashboard with management buttons')
}

// Run the test
testAdmin().catch(console.error)
