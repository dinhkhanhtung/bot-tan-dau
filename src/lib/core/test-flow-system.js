/**
 * Test Script for New Flow System
 * Chạy script này để test hệ thống mới trước khi deploy
 */

const { flowAdapter } = require('../flows/index')

// Sample test user
const testUser = {
    facebook_id: 'test_user_123',
    name: 'Test User',
    status: 'trial',
    phone: '0123456789',
    membership_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

async function runTests() {
    console.log('🧪 BẮT ĐẦU TEST HỆ THỐNG FLOW MỚI')
    console.log('=====================================')

    // Test 1: Check system status
    console.log('\n📊 Test 1: Kiểm tra trạng thái hệ thống')
    console.log('Status:', flowAdapter.getStatus())

    // Test 2: Test text message routing
    console.log('\n💬 Test 2: Test định tuyến tin nhắn văn bản')
    const testMessages = [
        'đăng ký',
        'tìm kiếm nhà',
        'niêm yết',
        'cộng đồng',
        'thanh toán',
        'tử vi',
        'điểm thưởng',
        'cài đặt',
        'hỗ trợ',
        'xin chào'
    ]

    for (const message of testMessages) {
        console.log(`\n   Testing: "${message}"`)
        try {
            const success = await flowAdapter.testNewSystem(testUser, message)
            console.log(`   ✅ Result: ${success ? 'PASS' : 'FAIL'}`)
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`)
        }
    }

    // Test 3: Test postback routing
    console.log('\n🔘 Test 3: Test định tuyến postback')
    const testPostbacks = [
        'REGISTER',
        'LISTING',
        'SEARCH',
        'COMMUNITY',
        'PAYMENT',
        'HOROSCOPE',
        'POINTS',
        'SETTINGS',
        'SUPPORT',
        'MAIN_MENU'
    ]

    for (const postback of testPostbacks) {
        console.log(`\n   Testing postback: "${postback}"`)
        try {
            const success = await testPostbackRouting(testUser, postback)
            console.log(`   ✅ Result: ${success ? 'PASS' : 'FAIL'}`)
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`)
        }
    }

    // Test 4: Enable new system and test again
    console.log('\n🚀 Test 4: Bật hệ thống mới và test lại')
    flowAdapter.enableNewSystem()
    console.log('New system status:', flowAdapter.getStatus())

    console.log(`\n   Testing with new system: "đăng ký"`)
    try {
        await flowAdapter.handleMessage(testUser, 'đăng ký')
        console.log(`   ✅ New system test: PASS`)
    } catch (error) {
        console.log(`   ❌ New system test error: ${error.message}`)
    }

    console.log('\n🎉 HOÀN THÀNH TEST!')
    console.log('=====================================')
    console.log('💡 Để sử dụng hệ thống mới:')
    console.log('   1. Import: const { flowAdapter } = require("./lib/flows")')
    console.log('   2. Enable: flowAdapter.enableNewSystem()')
    console.log('   3. Use: await flowAdapter.handleMessage(user, text)')
}

// Helper function to test postback routing
async function testPostbackRouting(user, postback) {
    try {
        // Create a mock context for testing
        const context = {
            user,
            text: '',
            isPostback: true,
            postback,
            session: null
        }

        // Import and use message router directly for testing
        const { messageRouter } = require('./message-router.ts')
        await messageRouter.routeMessage(context)
        return true
    } catch (error) {
        console.error('Postback test error:', error)
        return false
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error)
}

module.exports = { runTests }
