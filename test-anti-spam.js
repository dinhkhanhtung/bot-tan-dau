// Test script để kiểm tra hệ thống anti-spam
const { handleAntiSpam, isUserBlocked } = require('./src/lib/anti-spam.ts')

async function testAntiSpam() {
    console.log('🧪 Testing Anti-Spam System...\n')

    const testUserId = 'test_user_123'

    // Test 1: User chưa đăng ký - tin nhắn đầu tiên
    console.log('Test 1: Unregistered user - first message')
    const result1 = await handleAntiSpam(testUserId, 'Hello', 'unregistered', null)
    console.log('Result:', result1)
    console.log('Expected: action=none, block=false, message=Welcome sent\n')

    // Test 2: User chưa đăng ký - tin nhắn thứ 2 (không trong flow)
    console.log('Test 2: Unregistered user - second message (not in flow)')
    const result2 = await handleAntiSpam(testUserId, 'Hello again', 'unregistered', null)
    console.log('Result:', result2)
    console.log('Expected: action=warning, block=false\n')

    // Test 3: User chưa đăng ký - tin nhắn trong flow đăng ký
    console.log('Test 3: Unregistered user - message in registration flow')
    const result3 = await handleAntiSpam(testUserId, 'John Doe', 'unregistered', 'registration')
    console.log('Result:', result3)
    console.log('Expected: action=none, block=false\n')

    // Test 4: User đã đăng ký - tin nhắn thường
    console.log('Test 4: Registered user - normal message')
    const result4 = await handleAntiSpam(testUserId, 'Hello', 'registered', null)
    console.log('Result:', result4)
    console.log('Expected: action=none, block=false\n')

    // Test 5: User đã đăng ký - tin nhắn trong flow search
    console.log('Test 5: Registered user - message in search flow')
    const result5 = await handleAntiSpam(testUserId, 'iPhone', 'registered', 'search')
    console.log('Result:', result5)
    console.log('Expected: action=none, block=false\n')

    // Test 6: Kiểm tra user có bị block không
    console.log('Test 6: Check if user is blocked')
    const isBlocked = await isUserBlocked(testUserId)
    console.log('Is blocked:', isBlocked)
    console.log('Expected: false\n')

    console.log('✅ Anti-spam tests completed!')
}

// Chạy test
testAntiSpam().catch(console.error)
