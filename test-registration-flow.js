/**
 * Test script để kiểm tra luồng đăng ký
 * Mô phỏng user nhập tên trong form đăng ký
 */

const { UnifiedBotSystem } = require('./src/lib/core/unified-entry-point.ts')

async function testRegistrationFlow() {
    console.log('🧪 Testing Registration Flow...')

    // Mô phỏng user object
    const mockUser = {
        facebook_id: 'test_user_123',
        name: 'Test User'
    }

    try {
        // Test 1: User bắt đầu đăng ký
        console.log('\n📝 Test 1: User bắt đầu đăng ký')
        await UnifiedBotSystem.handleMessage(mockUser, '', false, 'REGISTER')

        // Test 2: User nhập tên (như trong hình ảnh)
        console.log('\n👤 Test 2: User nhập tên "Đình Khánh Tùng"')
        await UnifiedBotSystem.handleMessage(mockUser, 'Đình Khánh Tùng', false)

        // Test 3: User hỏi "sao vậy" (như trong hình ảnh)
        console.log('\n❓ Test 3: User hỏi "sao vậy"')
        await UnifiedBotSystem.handleMessage(mockUser, 'sao vậy', false)

        console.log('\n✅ Test completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

// Chạy test
testRegistrationFlow()
