// Test script để kiểm tra luồng tin nhắn thường
const {
    incrementNormalMessageCount,
    getUserChatBotOfferCount,
    setUserBotMode,
    checkUserBotMode
} = require('./src/lib/anti-spam.ts')

async function testNormalChatFlow() {
    console.log('🧪 Testing Normal Chat Flow...\n')

    const testUserId = 'test_normal_chat_123'

    // Test 1: Tin nhắn đầu tiên - chào mừng + nút "Chat Bot"
    console.log('Test 1: First message - welcome + Chat Bot button')
    incrementNormalMessageCount(testUserId) // count = 1
    const data1 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data1?.count)
    console.log('Expected: 1')
    console.log('Expected behavior: Send welcome message + Chat Bot button\n')

    // Test 2: Tin nhắn thứ 2 - chỉ thông báo admin, KHÔNG có nút
    console.log('Test 2: Second message - admin notification only, NO button')
    incrementNormalMessageCount(testUserId) // count = 2
    const data2 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data2?.count)
    console.log('Expected: 2')
    console.log('Expected behavior: Send admin notification only, NO button\n')

    // Test 3: Tin nhắn thứ 3 - bot dừng hoàn toàn
    console.log('Test 3: Third message - bot stops completely')
    incrementNormalMessageCount(testUserId) // count = 3
    const data3 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data3?.count)
    console.log('Expected: 3')
    console.log('Expected behavior: Bot stops completely, send nothing\n')

    // Test 4: User ấn nút "Chat Bot" - vào bot mode
    console.log('Test 4: User clicks Chat Bot button - enter bot mode')
    setUserBotMode(testUserId)
    const isInBotMode = await checkUserBotMode(testUserId)
    console.log('Is in bot mode:', isInBotMode)
    console.log('Expected: true')
    console.log('Expected behavior: User enters bot mode, can use bot features\n')

    // Test 5: Tin nhắn trong bot mode - xử lý bình thường
    console.log('Test 5: Message in bot mode - normal processing')
    console.log('Expected behavior: Process message normally with bot features\n')

    console.log('✅ Normal Chat Flow tests completed!')
    console.log('\n📋 Summary:')
    console.log('1. First message: Welcome + Chat Bot button')
    console.log('2. Second message: Admin notification only, NO button')
    console.log('3. Third+ message: Bot stops completely')
    console.log('4. Click Chat Bot: Enter bot mode')
    console.log('5. In bot mode: Normal bot processing')
}

// Chạy test
testNormalChatFlow()
