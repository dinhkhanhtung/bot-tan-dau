// Test script để kiểm tra luồng Chat Bot mới
const {
    setUserBotMode,
    exitUserBotMode,
    checkUserBotMode,
    sendChatBotWelcome,
    handleBotExit
} = require('./src/lib/anti-spam.ts')

async function testChatBotFlow() {
    console.log('🧪 Testing Chat Bot Flow...\n')

    const testUserId = 'test_user_456'

    // Test 1: User chưa trong bot mode
    console.log('Test 1: User not in bot mode')
    const isInBot1 = await checkUserBotMode(testUserId)
    console.log('Is in bot mode:', isInBot1)
    console.log('Expected: false\n')

    // Test 2: User ấn nút "Chat Bot"
    console.log('Test 2: User clicks Chat Bot button')
    setUserBotMode(testUserId)
    const isInBot2 = await checkUserBotMode(testUserId)
    console.log('Is in bot mode:', isInBot2)
    console.log('Expected: true\n')

    // Test 3: Gửi welcome message cho user đã đăng ký
    console.log('Test 3: Send welcome for registered user')
    try {
        await sendChatBotWelcome(testUserId, 'registered')
        console.log('✅ Welcome sent for registered user')
    } catch (error) {
        console.log('❌ Error sending welcome:', error.message)
    }
    console.log('Expected: Bot mode activated message with menu\n')

    // Test 4: Gửi welcome message cho user chưa đăng ký
    console.log('Test 4: Send welcome for unregistered user')
    try {
        await sendChatBotWelcome(testUserId, 'unregistered')
        console.log('✅ Welcome sent for unregistered user')
    } catch (error) {
        console.log('❌ Error sending welcome:', error.message)
    }
    console.log('Expected: Community info message with registration options\n')

    // Test 5: User ấn nút "Thoát Bot"
    console.log('Test 5: User clicks Exit Bot button')
    try {
        await handleBotExit(testUserId)
        console.log('✅ Bot exit handled')
    } catch (error) {
        console.log('❌ Error handling bot exit:', error.message)
    }
    console.log('Expected: Exit confirmation with Chat Bot button only\n')

    // Test 6: Kiểm tra user đã thoát bot mode
    console.log('Test 6: Check user exited bot mode')
    const isInBot3 = await checkUserBotMode(testUserId)
    console.log('Is in bot mode:', isInBot3)
    console.log('Expected: false\n')

    console.log('✅ Chat Bot Flow tests completed!')
}

// Chạy test
testChatBotFlow().catch(console.error)
