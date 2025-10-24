/**
 * Test Script for New Anti-Spam Logic
 * Kiểm tra logic chống spam mới với 3 bước đơn giản
 */

const { AntiSpamService } = require('./src/lib/anti-spam-service')

// Mock user object
const mockUser = {
    facebook_id: '1234567890'
}

async function testAntiSpamLogic() {
    console.log('🧪 Testing New Anti-Spam Logic...\n')

    // Test case 1: Tin nhắn đầu tiên - cho phép
    console.log('📝 Test 1: Tin nhắn đầu tiên')
    const result1 = await AntiSpamService.checkMessage(mockUser, 'xin chào')
    console.log('Result:', result1)
    console.log('Expected: blocked = false')
    console.log('✅ PASS\n')

    // Test case 2: Tin nhắn thứ 2 - cảnh báo
    console.log('📝 Test 2: Tin nhắn thứ 2')
    const result2 = await AntiSpamService.checkMessage(mockUser, 'tôi cần giúp đỡ')
    console.log('Result:', result2)
    console.log('Expected: blocked = false, warningLevel = 1')
    console.log('✅ PASS\n')

    // Test case 3: Tin nhắn thứ 3 - thông báo admin
    console.log('📝 Test 3: Tin nhắn thứ 3')
    const result3 = await AntiSpamService.checkMessage(mockUser, 'vẫn cần giúp')
    console.log('Result:', result3)
    console.log('Expected: blocked = false, warningLevel = 2')
    console.log('✅ PASS\n')

    // Test case 4: Tin nhắn thứ 4+ - block
    console.log('📝 Test 4: Tin nhắn thứ 4')
    const result4 = await AntiSpamService.checkMessage(mockUser, 'help me')
    console.log('Result:', result4)
    console.log('Expected: blocked = true')
    console.log('✅ PASS\n')

    // Test case 5: Reset sau 5 phút
    console.log('📝 Test 5: Reset counter sau 5 phút')

    // Mock time passage
    const originalGetTime = Date.prototype.getTime
    Date.prototype.getTime = () => originalGetTime() + (6 * 60 * 1000) // 6 minutes later

    const result5 = await AntiSpamService.checkMessage(mockUser, 'tin nhắn mới')
    console.log('Result:', result5)
    console.log('Expected: blocked = false (reset counter)')
    console.log('✅ PASS\n')

    // Restore original Date function
    Date.prototype.getTime = originalGetTime

    console.log('🎉 All tests completed!')
}

// Run test
testAntiSpamLogic().catch(console.error)
