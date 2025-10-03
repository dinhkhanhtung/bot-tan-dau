// Test script để kiểm tra giới hạn hiển thị nút Chat Bot
const {
    shouldShowChatBotButton,
    resetChatBotOfferCount,
    setUserBotMode
} = require('./src/lib/anti-spam.ts')

async function testChatBotLimit() {
    console.log('🧪 Testing Chat Bot Button Limit...\n')

    const testUserId = 'test_user_limit_789'

    // Test 1: Lần đầu tiên - nên hiển thị nút
    console.log('Test 1: First time - should show button')
    const show1 = shouldShowChatBotButton(testUserId)
    console.log('Should show button:', show1)
    console.log('Expected: true\n')

    // Test 2: Lần thứ 2 - không nên hiển thị nút
    console.log('Test 2: Second time - should NOT show button')
    const show2 = shouldShowChatBotButton(testUserId)
    console.log('Should show button:', show2)
    console.log('Expected: false\n')

    // Test 3: Lần thứ 3 - vẫn không nên hiển thị nút
    console.log('Test 3: Third time - should still NOT show button')
    const show3 = shouldShowChatBotButton(testUserId)
    console.log('Should show button:', show3)
    console.log('Expected: false\n')

    // Test 4: User ấn nút Chat Bot - KHÔNG reset counter
    console.log('Test 4: User clicks Chat Bot button - NO reset')
    setUserBotMode(testUserId)
    const show4 = shouldShowChatBotButton(testUserId)
    console.log('Should show button after clicking:', show4)
    console.log('Expected: false (still at limit)\n')

    console.log('✅ Chat Bot Button Limit tests completed!')
}

// Chạy test
testChatBotLimit().catch(console.error)
