/**
 * Test Script for PENDING_USER functionality
 * 
 * This script tests the new PENDING_USER system to ensure it works correctly
 * and provides a smooth user experience while maintaining security.
 */

const { createClient } = require('@supabase/supabase-js')

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your_supabase_url'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your_service_key'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test data
const testUser = {
    facebook_id: 'test_pending_user_123',
    name: 'Test Pending User',
    phone: '0901234567',
    location: 'Hà Nội',
    status: 'pending',
    created_at: new Date().toISOString()
}

async function runTests() {
    console.log('🧪 BẮT ĐẦU TEST PENDING_USER SYSTEM')
    console.log('='.repeat(50))

    try {
        // Test 1: Tạo test user với status pending
        await testCreatePendingUser()

        // Test 2: Kiểm tra permission matrix
        await testPermissionMatrix()

        // Test 3: Kiểm tra rate limiting
        await testRateLimiting()

        // Test 4: Kiểm tra abuse detection
        await testAbuseDetection()

        // Test 5: Kiểm tra user activities tracking
        await testUserActivities()

        // Test 6: Cleanup test data
        await cleanupTestData()

        console.log('✅ TẤT CẢ TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG!')

    } catch (error) {
        console.error('❌ TEST FAILED:', error)
        process.exit(1)
    }
}

async function testCreatePendingUser() {
    console.log('\n📝 Test 1: Tạo PENDING_USER')

    // Xóa user cũ nếu tồn tại
    await supabase
        .from('users')
        .delete()
        .eq('facebook_id', testUser.facebook_id)

    // Tạo user mới với status pending
    const { data, error } = await supabase
        .from('users')
        .insert(testUser)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create pending user: ${error.message}`)
    }

    console.log('✅ PENDING_USER created successfully:', data.id)
}

async function testPermissionMatrix() {
    console.log('\n🔐 Test 2: Kiểm tra Permission Matrix')

    // Import SmartContextManager
    const { SmartContextManager, UserType } = require('./src/lib/core/smart-context-manager')

    // Test permissions for PENDING_USER
    const permissions = SmartContextManager.getUserPermissions(UserType.PENDING_USER)

    console.log('PENDING_USER Permissions:')
    console.log('- canUseBot:', permissions.canUseBot)
    console.log('- canSearch:', permissions.canSearch)
    console.log('- canViewListings:', permissions.canViewListings)
    console.log('- canCreateListings:', permissions.canCreateListings)
    console.log('- canContactSellers:', permissions.canContactSellers)
    console.log('- canMakePayments:', permissions.canMakePayments)
    console.log('- canUseAdminChat:', permissions.canUseAdminChat)
    console.log('- canAccessCommunity:', permissions.canAccessCommunity)
    console.log('- canUsePoints:', permissions.canUsePoints)
    console.log('- canAccessSettings:', permissions.canAccessSettings)

    // Verify expected permissions
    const expectedPermissions = {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: false,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false
    }

    for (const [key, expected] of Object.entries(expectedPermissions)) {
        if (permissions[key] !== expected) {
            throw new Error(`Permission mismatch for ${key}: expected ${expected}, got ${permissions[key]}`)
        }
    }

    console.log('✅ Permission matrix verified successfully')
}

async function testRateLimiting() {
    console.log('\n⏱️ Test 3: Kiểm tra Rate Limiting')

    const { SafetyMeasures } = require('./src/lib/safety-measures')

    // Test rate limit check
    const rateLimitCheck = await SafetyMeasures.checkRateLimit(
        'pending_user',
        'searches',
        testUser.facebook_id
    )

    console.log('Rate limit check result:', rateLimitCheck)

    if (!rateLimitCheck.allowed) {
        throw new Error('Rate limit should allow first search')
    }

    // Test recording activity
    await SafetyMeasures.recordActivity(
        'pending_user',
        'searches',
        testUser.facebook_id
    )

    console.log('✅ Rate limiting system working correctly')
}

async function testAbuseDetection() {
    console.log('\n🛡️ Test 4: Kiểm tra Abuse Detection')

    const { SafetyMeasures } = require('./src/lib/safety-measures')

    // Test abuse detection
    const abuseCheck = await SafetyMeasures.detectAbuse(testUser.facebook_id)

    console.log('Abuse detection result:', abuseCheck)

    if (abuseCheck.isAbuse) {
        throw new Error('New user should not be detected as abuse')
    }

    console.log('✅ Abuse detection system working correctly')
}

async function testUserActivities() {
    console.log('\n📊 Test 5: Kiểm tra User Activities Tracking')

    const { SafetyMeasures } = require('./src/lib/safety-measures')

    // Test getting user activity stats
    const stats = await SafetyMeasures.getUserActivityStats(testUser.facebook_id, 7)

    console.log('User activity stats:', stats)

    if (stats.length === 0) {
        throw new Error('Should have at least one activity record')
    }

    console.log('✅ User activities tracking working correctly')
}

async function cleanupTestData() {
    console.log('\n🧹 Test 6: Cleanup Test Data')

    // Xóa test user
    await supabase
        .from('users')
        .delete()
        .eq('facebook_id', testUser.facebook_id)

    // Xóa test activities
    await supabase
        .from('user_activities')
        .delete()
        .eq('facebook_id', testUser.facebook_id)

    console.log('✅ Test data cleaned up successfully')
}

// Chạy tests
if (require.main === module) {
    runTests().catch(console.error)
}

module.exports = {
    runTests,
    testUser
}
