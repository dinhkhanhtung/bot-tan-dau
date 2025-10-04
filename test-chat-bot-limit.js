// Test script để kiểm tra giới hạn hiển thị nút Chat Bot
const {
    shouldShowChatBotButton,
    resetChatBotOfferCount,
    incrementNormalMessageCount,
    getUserChatBotOfferCount,
    setUserBotMode
} = require('./src/lib/anti-spam.ts')

async function testChatBotLimit() {
    console.log('🧪 Testing Chat Bot Button Limit...\n')

    const testUserId = 'test_user_limit_789'

    // Test 1: Lần đầu tiên - chào mừng + nút
    console.log('Test 1: First time - welcome message + button')
    incrementNormalMessageCount(testUserId) // count = 1
    const data1 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data1?.count)
    console.log('Expected: 1\n')

    // Test 2: Lần thứ 2 - chỉ thông báo admin, KHÔNG có nút
    console.log('Test 2: Second time - admin notification only, NO button')
    incrementNormalMessageCount(testUserId) // count = 2
    const data2 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data2?.count)
    console.log('Expected: 2\n')

    // Test 3: Lần thứ 3 - bot dừng hoàn toàn
    console.log('Test 3: Third time - bot should stop completely')
    incrementNormalMessageCount(testUserId) // count = 3
    const data3 = getUserChatBotOfferCount(testUserId)
    console.log('Count:', data3?.count)
    console.log('Expected: 3\n')

    // Test 4: User ấn nút Chat Bot - KHÔNG reset counter
    console.log('Test 4: User clicks Chat Bot button - NO reset')
    setUserBotMode(testUserId)
    const data4 = getUserChatBotOfferCount(testUserId)
    console.log('Count after clicking:', data4?.count)
    console.log('Expected: 3 (still at limit)\n')

    console.log('✅ Chat Bot Button Limit tests completed!')
}

// Chạy test
testChatBotLimit().catch(console.error)
