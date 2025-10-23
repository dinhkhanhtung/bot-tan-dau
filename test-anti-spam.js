/**
 * Test Script for Anti-Spam Logic
 * Kiểm tra xem logic chống spam có hoạt động đúng không
 */

import { UnifiedBotSystem } from './src/lib/core/unified-entry-point.ts'
import { AdminTakeoverService } from './src/lib/admin-takeover-service.ts'
import { handleAntiSpam } from './src/lib/anti-spam.ts'
import { AntiSpamService } from './src/lib/anti-spam-service.ts'

async function testAntiSpamLogic() {
    console.log('🧪 Testing Anti-Spam Logic...\n')

    // Test user
    const testUser = {
        facebook_id: 'test_user_123',
        status: 'new_user'
    }

    console.log('1️⃣ Testing consecutive messages detection...')

    try {
        // Test 1: First message - should not trigger spam
        const result1 = await AdminTakeoverService.handleConsecutiveUserMessages(testUser.facebook_id, 'Hello')
        console.log(`   First message result: ${result1 ? 'SPAM DETECTED' : 'OK'}`)

        // Test 2: Second message within 5 minutes - should trigger spam
        const result2 = await AdminTakeoverService.handleConsecutiveUserMessages(testUser.facebook_id, 'Hello again')
        console.log(`   Second message result: ${result2 ? 'SPAM DETECTED ✅' : 'NOT DETECTED ❌'}`)

        if (result2) {
            console.log('   ✅ Consecutive messages detection working correctly')
        } else {
            console.log('   ❌ Consecutive messages detection failed')
        }
    } catch (error) {
        console.error('   ❌ Error testing consecutive messages:', error.message)
    }

    console.log('\n2️⃣ Testing anti-spam system...')

    try {
        // Test anti-spam with unregistered user
        const spamResult = await handleAntiSpam(testUser.facebook_id, 'test message', testUser.status, null)
        console.log(`   Anti-spam result: ${spamResult.block ? 'BLOCKED' : 'ALLOWED'}`)
        console.log(`   Action: ${spamResult.action || 'none'}`)

        if (spamResult.block) {
            console.log('   ✅ Anti-spam system working correctly')
        } else {
            console.log('   ⚠️ Anti-spam allowed message (might be normal)')
        }
    } catch (error) {
        console.error('   ❌ Error testing anti-spam:', error.message)
    }

    console.log('\n3️⃣ Testing UnifiedBotSystem integration...')

    try {
        // Test UnifiedBotSystem with spam message
        console.log('   Testing with spam message...')
        await UnifiedBotSystem.handleMessage(testUser, 'spam message')

        // Test UnifiedBotSystem with consecutive message
        console.log('   Testing with consecutive message...')
        await UnifiedBotSystem.handleMessage(testUser, 'another message')

        console.log('   ✅ UnifiedBotSystem integration test completed')
    } catch (error) {
        console.error('   ❌ Error testing UnifiedBotSystem:', error.message)
    }

    console.log('\n🎯 Anti-Spam Logic Test Summary:')
    console.log('   - Consecutive messages: Should detect 2nd message within 5 minutes')
    console.log('   - Anti-spam system: Should handle different user types')
    console.log('   - UnifiedBotSystem: Should integrate all anti-spam checks')
    console.log('   - User isolation: Should only affect the spamming user')

    console.log('\n✨ Test completed! Check the logs above for detailed results.')
}

// Run the test
testAntiSpamLogic().catch(console.error)

export { testAntiSpamLogic }
