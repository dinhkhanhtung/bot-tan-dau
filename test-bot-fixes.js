/**
 * Test Script for Bot Tân Dậu 1981 Fixes
 * Run this script to verify all fixes are working correctly
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseMigration() {
    console.log('🧪 Testing Database Migration...')
    
    try {
        // Test 1: Check if welcome_message_sent field exists
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('welcome_message_sent')
            .limit(1)
        
        if (usersError) {
            console.error('❌ welcome_message_sent field missing:', usersError.message)
            return false
        }
        console.log('✅ welcome_message_sent field exists')
        
        // Test 2: Check if admin_chat_sessions table exists
        const { data: sessions, error: sessionsError } = await supabase
            .from('admin_chat_sessions')
            .select('*')
            .limit(1)
        
        if (sessionsError) {
            console.error('❌ admin_chat_sessions table missing:', sessionsError.message)
            return false
        }
        console.log('✅ admin_chat_sessions table exists')
        
        return true
    } catch (error) {
        console.error('❌ Database migration test failed:', error)
        return false
    }
}

async function testAdminFunctionality() {
    console.log('🧪 Testing Admin Functionality...')
    
    try {
        // Test admin detection
        const adminIds = process.env.ADMIN_IDS || ''
        const envAdmins = adminIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
        
        if (envAdmins.length === 0) {
            console.error('❌ No admin IDs configured in ADMIN_IDS environment variable')
            return false
        }
        
        console.log(`✅ Found ${envAdmins.length} admin(s) configured:`, envAdmins)
        
        // Test admin users table
        const { data: dbAdmins, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
        
        if (adminError) {
            console.log('⚠️ admin_users table not accessible (this is OK if using env vars only)')
        } else {
            console.log(`✅ admin_users table accessible, found ${dbAdmins?.length || 0} admin(s)`)
        }
        
        return true
    } catch (error) {
        console.error('❌ Admin functionality test failed:', error)
        return false
    }
}

async function testWelcomeMessageTracking() {
    console.log('🧪 Testing Welcome Message Tracking...')
    
    try {
        // Create a test user to verify welcome message tracking
        const testUserId = `test_${Date.now()}`
        
        // Test creating user with welcome_message_sent = false
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                facebook_id: testUserId,
                name: 'Test User',
                phone: `test_${testUserId}`,
                location: 'Test Location',
                birthday: 1981,
                referral_code: `TD1981-${testUserId.slice(-6)}`,
                welcome_message_sent: false
            })
        
        if (insertError) {
            console.error('❌ Failed to create test user:', insertError.message)
            return false
        }
        
        // Test updating welcome_message_sent
        const { error: updateError } = await supabase
            .from('users')
            .update({ welcome_message_sent: true })
            .eq('facebook_id', testUserId)
        
        if (updateError) {
            console.error('❌ Failed to update welcome_message_sent:', updateError.message)
            return false
        }
        
        // Verify the update
        const { data: user, error: selectError } = await supabase
            .from('users')
            .select('welcome_message_sent')
            .eq('facebook_id', testUserId)
            .single()
        
        if (selectError || !user || user.welcome_message_sent !== true) {
            console.error('❌ Welcome message tracking not working properly')
            return false
        }
        
        // Clean up test user
        await supabase
            .from('users')
            .delete()
            .eq('facebook_id', testUserId)
        
        console.log('✅ Welcome message tracking working correctly')
        return true
    } catch (error) {
        console.error('❌ Welcome message tracking test failed:', error)
        return false
    }
}

async function testAdminChatSessions() {
    console.log('🧪 Testing Admin Chat Sessions...')
    
    try {
        const testUserId = `test_chat_${Date.now()}`
        
        // Test creating admin chat session
        const { data: session, error: insertError } = await supabase
            .from('admin_chat_sessions')
            .insert({
                user_id: testUserId,
                status: 'waiting'
            })
            .select()
            .single()
        
        if (insertError) {
            console.error('❌ Failed to create admin chat session:', insertError.message)
            return false
        }
        
        console.log('✅ Admin chat session created successfully')
        
        // Test updating session status
        const { error: updateError } = await supabase
            .from('admin_chat_sessions')
            .update({ 
                status: 'active',
                admin_id: 'test_admin_123'
            })
            .eq('id', session.id)
        
        if (updateError) {
            console.error('❌ Failed to update admin chat session:', updateError.message)
            return false
        }
        
        console.log('✅ Admin chat session updated successfully')
        
        // Test ending session
        const { error: endError } = await supabase
            .from('admin_chat_sessions')
            .update({
                status: 'closed',
                ended_at: new Date().toISOString()
            })
            .eq('id', session.id)
        
        if (endError) {
            console.error('❌ Failed to end admin chat session:', endError.message)
            return false
        }
        
        console.log('✅ Admin chat session ended successfully')
        
        // Clean up test session
        await supabase
            .from('admin_chat_sessions')
            .delete()
            .eq('id', session.id)
        
        return true
    } catch (error) {
        console.error('❌ Admin chat sessions test failed:', error)
        return false
    }
}

async function runAllTests() {
    console.log('🚀 Starting Bot Tân Dậu 1981 Fix Tests...\n')
    
    const tests = [
        { name: 'Database Migration', fn: testDatabaseMigration },
        { name: 'Admin Functionality', fn: testAdminFunctionality },
        { name: 'Welcome Message Tracking', fn: testWelcomeMessageTracking },
        { name: 'Admin Chat Sessions', fn: testAdminChatSessions }
    ]
    
    let passedTests = 0
    let totalTests = tests.length
    
    for (const test of tests) {
        console.log(`\n--- ${test.name} ---`)
        try {
            const result = await test.fn()
            if (result) {
                passedTests++
                console.log(`✅ ${test.name} PASSED`)
            } else {
                console.log(`❌ ${test.name} FAILED`)
            }
        } catch (error) {
            console.log(`❌ ${test.name} FAILED with error:`, error.message)
        }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`)
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Bot fixes are working correctly.')
        console.log('\n📋 Next steps:')
        console.log('1. Deploy the code changes')
        console.log('2. Test manually with real Facebook Messenger')
        console.log('3. Verify admin functionality in production')
    } else {
        console.log('⚠️  Some tests failed. Please check the issues above.')
        console.log('\n🔧 Troubleshooting:')
        console.log('1. Make sure database migration was run successfully')
        console.log('2. Check environment variables (ADMIN_IDS, database credentials)')
        console.log('3. Verify database permissions')
    }
    
    process.exit(passedTests === totalTests ? 0 : 1)
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('💥 Test runner failed:', error)
        process.exit(1)
    })
}

module.exports = {
    testDatabaseMigration,
    testAdminFunctionality,
    testWelcomeMessageTracking,
    testAdminChatSessions,
    runAllTests
}
