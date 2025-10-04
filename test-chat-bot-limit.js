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
    incrementNormalMessageCount(testUserId)
    const show1 = shouldShowChatBotButton(testUserId)
    const stop1 = shouldBotStopCompletely(testUserId)
    console.log('Should show button:', show1)
    console.log('Should bot stop:', stop1)
    console.log('Expected: true, false\n')

    // Test 2: Lần thứ 2 - bot dừng hoàn toàn
    console.log('Test 2: Second time - bot should stop completely')
    incrementNormalMessageCount(testUserId)
    const show2 = shouldShowChatBotButton(testUserId)
    const stop2 = shouldBotStopCompletely(testUserId)
    console.log('Should show button:', show2)
    console.log('Should bot stop:', stop2)
    console.log('Expected: false, true\n')

    // Test 3: Lần thứ 3 - vẫn dừng hoàn toàn
    console.log('Test 3: Third time - should still stop completely')
    incrementNormalMessageCount(testUserId)
    const show3 = shouldShowChatBotButton(testUserId)
    const stop3 = shouldBotStopCompletely(testUserId)
    console.log('Should show button:', show3)
    console.log('Should bot stop:', stop3)
    console.log('Expected: false, true\n')

    // Test 4: User ấn nút Chat Bot - KHÔNG reset counter
    console.log('Test 4: User clicks Chat Bot button - NO reset')
    setUserBotMode(testUserId)
    const show4 = shouldShowChatBotButton(testUserId)
    const stop4 = shouldBotStopCompletely(testUserId)
    console.log('Should show button after clicking:', show4)
    console.log('Should bot stop after clicking:', stop4)
    console.log('Expected: false, true (still at limit)\n')

    console.log('✅ Chat Bot Button Limit tests completed!')
}

// Chạy test
testChatBotLimit().catch(console.error)
