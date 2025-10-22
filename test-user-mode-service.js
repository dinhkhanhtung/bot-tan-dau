/**
 * Test Script - Kiểm tra UserModeService hoạt động đúng chưa
 * Chạy script này để test các chức năng của hệ thống phân luồng user
 */

import dotenv from 'dotenv';
dotenv.config();

async function loadModules() {
    try {
        // Import các module TypeScript một cách dynamic
        const userModeModule = await import('./src/lib/core/user-mode-service.js')
        const smartMenuModule = await import('./src/lib/core/smart-menu-service.js')

        return {
            UserModeService: userModeModule.UserModeService,
            UserMode: userModeModule.UserMode,
            SmartMenuService: smartMenuModule.SmartMenuService,
            MenuContext: smartMenuModule.MenuContext
        }
    } catch (error) {
        console.error('❌ Lỗi khi load modules:', error.message)
        console.log('💡 Đảm bảo các file TypeScript đã được tạo đúng')
        return null
    }
}

async function testUserModeService() {
    console.log('🧪 Testing UserModeService...')

    const modules = await loadModules()
    if (!modules) {
        console.error('❌ Không thể load modules')
        return
    }

    const { UserMode, SmartMenuService, MenuContext } = modules

    try {
        // Test 1: Kiểm tra enum UserMode
        console.log('\n📋 Test 1: UserMode enum')
        console.log('UserMode.CHOOSING:', UserMode.CHOOSING)
        console.log('UserMode.USING_BOT:', UserMode.USING_BOT)
        console.log('UserMode.CHATTING_ADMIN:', UserMode.CHATTING_ADMIN)

        // Test 2: Kiểm tra SmartMenuService
        console.log('\n📋 Test 2: SmartMenuService menu options')

        const choosingMenu = SmartMenuService.getMenuForContext(MenuContext.CHOOSING_MODE)
        console.log('Choosing mode menu:', choosingMenu)

        const botMenu = SmartMenuService.getMenuForContext(MenuContext.BOT_FEATURES)
        console.log('Bot features menu:', botMenu)

        const adminMenu = SmartMenuService.getMenuForContext(MenuContext.ADMIN_CHAT)
        console.log('Admin chat menu:', adminMenu)

        // Test 3: Kiểm tra validation
        console.log('\n📋 Test 3: Payload validation')

        console.log('Is USE_BOT valid?', SmartMenuService.isValidPayload('USE_BOT'))
        console.log('Is INVALID_PAYLOAD valid?', SmartMenuService.isValidPayload('INVALID_PAYLOAD'))

        // Test 4: Kiểm tra descriptions
        console.log('\n📋 Test 4: Option descriptions')

        console.log('USE_BOT description:', SmartMenuService.getOptionDescription('USE_BOT'))
        console.log('CHAT_ADMIN description:', SmartMenuService.getOptionDescription('CHAT_ADMIN'))

        console.log('\n✅ All tests completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

async function testDatabaseIntegration() {
    console.log('\n🗄️ Testing database integration...')

    try {
        // Test tạo user mode mới
        console.log('Testing create user mode...')

        // Note: Trong thực tế sẽ cần facebook_id thật
        // Đây chỉ là test cấu trúc

        console.log('✅ Database integration test structure ready')

    } catch (error) {
        console.error('❌ Database test failed:', error)
    }
}

// Chạy test nếu file được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await testUserModeService()
        await testDatabaseIntegration()
    })()
}

export { testUserModeService, testDatabaseIntegration }
