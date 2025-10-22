/**
 * Test Script for AdminTakeoverService
 * Kiểm tra các chức năng chính của AdminTakeoverService
 */

import dotenv from 'dotenv';
dotenv.config();

import { AdminTakeoverService } from './src/lib/admin-takeover-service.js';

// Mock data for testing
const TEST_USER_ID = 'test_user_123'
const TEST_ADMIN_ID = 'test_admin_456'

async function testAdminTakeoverService() {
    console.log('🧪 Testing AdminTakeoverService...')

    try {
        // Test 1: Kiểm tra trạng thái ban đầu
        console.log('\n1️⃣ Testing initial state...')
        const initialState = await AdminTakeoverService.getTakeoverState(TEST_USER_ID)
        console.log('Initial state:', initialState)

        // Test 2: Xử lý tin nhắn đầu tiên
        console.log('\n2️⃣ Testing first message...')
        const needsSupport1 = await AdminTakeoverService.handleConsecutiveUserMessages(
            TEST_USER_ID,
            'Hello, I need help'
        )
        console.log('Needs admin support after first message:', needsSupport1)

        // Test 3: Xử lý tin nhắn thứ hai liên tiếp
        console.log('\n3️⃣ Testing second consecutive message...')
        const needsSupport2 = await AdminTakeoverService.handleConsecutiveUserMessages(
            TEST_USER_ID,
            'Are you there?'
        )
        console.log('Needs admin support after second message:', needsSupport2)

        // Test 4: Kiểm tra trạng thái sau khi gửi tin nhắn liên tiếp
        console.log('\n4️⃣ Checking state after consecutive messages...')
        const stateAfterMessages = await AdminTakeoverService.getTakeoverState(TEST_USER_ID)
        console.log('State after messages:', stateAfterMessages)

        // Test 5: Admin bắt đầu takeover
        console.log('\n5️⃣ Testing admin takeover initiation...')
        await AdminTakeoverService.initiateAdminTakeover(TEST_USER_ID, TEST_ADMIN_ID)
        console.log('Admin takeover initiated successfully')

        // Test 6: Kiểm tra trạng thái sau khi admin takeover
        console.log('\n6️⃣ Checking state after admin takeover...')
        const stateAfterTakeover = await AdminTakeoverService.getTakeoverState(TEST_USER_ID)
        console.log('State after takeover:', stateAfterTakeover)

        // Test 7: Kiểm tra xem admin có active không
        console.log('\n7️⃣ Testing admin active check...')
        const isAdminActive = await AdminTakeoverService.isAdminActive(TEST_USER_ID)
        console.log('Is admin active:', isAdminActive)

        // Test 8: Lấy danh sách users đang chờ admin
        console.log('\n8️⃣ Testing get users waiting for admin...')
        const waitingUsers = await AdminTakeoverService.getUsersWaitingForAdmin()
        console.log('Users waiting for admin:', waitingUsers)

        // Test 9: Lấy thống kê takeover
        console.log('\n9️⃣ Testing takeover stats...')
        const stats = await AdminTakeoverService.getTakeoverStats()
        console.log('Takeover stats:', stats)

        // Test 10: Admin kết thúc takeover
        console.log('\n🔟 Testing admin takeover release...')
        await AdminTakeoverService.releaseAdminTakeover(TEST_USER_ID, TEST_ADMIN_ID)
        console.log('Admin takeover released successfully')

        // Test 11: Kiểm tra trạng thái cuối cùng
        console.log('\n1️⃣1️⃣ Checking final state...')
        const finalState = await AdminTakeoverService.getTakeoverState(TEST_USER_ID)
        console.log('Final state:', finalState)

        // Test 12: Reset message counter
        console.log('\n1️⃣2️⃣ Testing message counter reset...')
        await AdminTakeoverService.resetMessageCounter(TEST_USER_ID)
        console.log('Message counter reset successfully')

        console.log('\n✅ All tests completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
        console.error('Error details:', error.message)
    }
}

// Chạy test nếu file được thực thi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    testAdminTakeoverService()
        .then(() => {
            console.log('\n🎉 Test execution completed')
            process.exit(0)
        })
        .catch((error) => {
            console.error('\n💥 Test execution failed:', error)
            process.exit(1)
        })
}

export { testAdminTakeoverService }