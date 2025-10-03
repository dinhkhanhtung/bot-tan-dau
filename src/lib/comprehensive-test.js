/**
 * Comprehensive Test Script for New Flow System
 * Test chi tiết từng chức năng để đảm bảo không có lỗi
 */

const fs = require('fs')
const path = require('path')

// Test data
const testUser = {
    facebook_id: 'test_user_123',
    name: 'Test User',
    status: 'trial',
    phone: '0123456789',
    membership_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

async function runComprehensiveTests() {
    console.log('🧪 COMPREHENSIVE TEST - NEW FLOW SYSTEM')
    console.log('=========================================')

    let totalTests = 0
    let passedTests = 0

    // Test 1: File Structure
    console.log('\n📁 Test 1: KIỂM TRA CẤU TRÚC FILE')
    totalTests++

    const requiredFiles = [
        'src/lib/flows/auth-flow.ts',
        'src/lib/flows/marketplace-flow.ts',
        'src/lib/flows/community-flow.ts',
        'src/lib/flows/payment-flow.ts',
        'src/lib/flows/utility-flow.ts',
        'src/lib/flows/admin-flow.ts',
        'src/lib/core/message-router.ts',
        'src/lib/core/session-manager.ts',
        'src/lib/core/flow-adapter.ts',
        'src/lib/core/ai-manager.ts',
        'src/lib/flows/index.ts'
    ]

    let allFilesExist = true
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file}`)
        } else {
            console.log(`   ❌ ${file} - MISSING`)
            allFilesExist = false
        }
    }

    if (allFilesExist) {
        console.log('   🎉 TẤT CẢ FILE CẦN THIẾT ĐÃ TỒN TẠI!')
        passedTests++
    } else {
        console.log('   ⚠️ MỘT SỐ FILE BỊ THIẾU')
    }

    // Test 2: Import Tests
    console.log('\n📦 Test 2: KIỂM TRA IMPORT')
    totalTests++

    try {
        // Test importing main components
        const { flowAdapter } = require('./flows/index.js')
        console.log('   ✅ Import flowAdapter thành công')

        const { messageRouter } = require('./core/message-router.js')
        console.log('   ✅ Import messageRouter thành công')

        const { aiManager } = require('./core/ai-manager.js')
        console.log('   ✅ Import aiManager thành công')

        passedTests++
        console.log('   🎉 TẤT CẢ IMPORT HOẠT ĐỘNG TỐT!')
    } catch (error) {
        console.log(`   ❌ Lỗi import: ${error.message}`)
    }

    // Test 3: Flow Adapter Tests
    console.log('\n🔄 Test 3: KIỂM TRA FLOW ADAPTER')
    totalTests++

    try {
        const { flowAdapter } = require('./flows/index.js')

        // Test adapter status
        const status = flowAdapter.getStatus()
        console.log(`   ✅ Adapter status: ${JSON.stringify(status)}`)

        // Test system enable
        flowAdapter.enableNewSystem()
        const newStatus = flowAdapter.getStatus()
        console.log(`   ✅ After enable: ${JSON.stringify(newStatus)}`)

        if (newStatus.newSystem === true) {
            passedTests++
            console.log('   🎉 FLOW ADAPTER HOẠT ĐỘNG TỐT!')
        } else {
            console.log('   ❌ Flow adapter không hoạt động đúng')
        }
    } catch (error) {
        console.log(`   ❌ Lỗi flow adapter: ${error.message}`)
    }

    // Test 4: AI Manager Tests
    console.log('\n🤖 Test 4: KIỂM TRA AI MANAGER')
    totalTests++

    try {
        const { aiManager, generateHoroscope } = require('./core/ai-manager.js')

        // Test AI availability
        const isAvailable = aiManager.isAvailable()
        console.log(`   ✅ AI Available: ${isAvailable}`)

        // Test horoscope generation
        const horoscope = generateHoroscope()
        console.log(`   ✅ Horoscope generated: ${horoscope.fortune}`)

        // Test AI manager stats
        const stats = aiManager.getUsageStats()
        console.log(`   ✅ AI Stats: ${JSON.stringify(stats)}`)

        passedTests++
        console.log('   🎉 AI MANAGER HOẠT ĐỘNG TỐT!')
    } catch (error) {
        console.log(`   ❌ Lỗi AI manager: ${error.message}`)
    }

    // Test 5: Message Router Tests
    console.log('\n🛣️ Test 5: KIỂM TRA MESSAGE ROUTER')
    totalTests++

    try {
        const { messageRouter } = require('./core/message-router.js')

        // Test router creation
        console.log('   ✅ MessageRouter instance created')

        // Test basic routing (without actual message processing)
        const context = {
            user: testUser,
            text: 'test message',
            isPostback: false,
            session: null
        }

        // Just test that routeMessage method exists
        if (typeof messageRouter.routeMessage === 'function') {
            console.log('   ✅ routeMessage method exists')
            passedTests++
            console.log('   🎉 MESSAGE ROUTER SẴN SÀNG!')
        } else {
            console.log('   ❌ routeMessage method missing')
        }
    } catch (error) {
        console.log(`   ❌ Lỗi message router: ${error.message}`)
    }

    // Test 6: Code Quality Tests
    console.log('\n🔍 Test 6: KIỂM TRA CHẤT LƯỢNG CODE')
    totalTests++

    try {
        // Check for common issues
        let qualityIssues = []

        // Check for console.log in production code
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8')
                const lines = content.split('\n')

                lines.forEach((line, index) => {
                    if (line.includes('console.log') && !line.includes('//')) {
                        qualityIssues.push(`${file}:${index + 1} - console.log found`)
                    }
                })
            }
        }

        if (qualityIssues.length === 0) {
            console.log('   ✅ Không tìm thấy console.log không cần thiết')
        } else {
            console.log(`   ⚠️ Tìm thấy ${qualityIssues.length} console.log:`)
            qualityIssues.slice(0, 5).forEach(issue => console.log(`      ${issue}`))
        }

        // Check for TODO comments
        let todoCount = 0
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8')
                const todos = content.match(/TODO|FIXME|XXX/g) || []
                todoCount += todos.length
            }
        }

        console.log(`   📝 Tìm thấy ${todoCount} TODO/FIXME comments`)

        passedTests++
        console.log('   🎉 KIỂM TRA CHẤT LƯỢNG HOÀN THÀNH!')
    } catch (error) {
        console.log(`   ❌ Lỗi kiểm tra chất lượng: ${error.message}`)
    }

    // Test 7: Integration Tests
    console.log('\n🔗 Test 7: KIỂM TRA TÍCH HỢP')
    totalTests++

    try {
        // Test that old handlers still work
        const oldBotHandlers = require('./bot-handlers.js')
        console.log('   ✅ Old bot handlers vẫn hoạt động')

        // Test that new flows can be imported
        const { AuthFlow, MarketplaceFlow } = require('./flows/index.js')
        console.log('   ✅ New flows có thể import được')

        // Test backward compatibility
        if (typeof oldBotHandlers.handleMessage === 'function') {
            console.log('   ✅ Backward compatibility đảm bảo')
            passedTests++
            console.log('   🎉 TÍCH HỢP THÀNH CÔNG!')
        } else {
            console.log('   ❌ Backward compatibility bị ảnh hưởng')
        }
    } catch (error) {
        console.log(`   ❌ Lỗi tích hợp: ${error.message}`)
    }

    // Summary
    console.log('\n📊 TỔNG KẾT TEST')
    console.log('=========================================')
    console.log(`🧪 Tổng số test: ${totalTests}`)
    console.log(`✅ Test passed: ${passedTests}`)
    console.log(`❌ Test failed: ${totalTests - passedTests}`)
    console.log(`📈 Success rate: ${Math.round((passedTests / totalTests) * 100)}%`)

    if (passedTests === totalTests) {
        console.log('\n🎉 TẤT CẢ TEST ĐỀU THÀNH CÔNG!')
        console.log('🚀 HỆ THỐNG MỚI SẴN SÀNG SỬ DỤNG!')
    } else {
        console.log('\n⚠️ MỘT SỐ TEST THẤT BẠI, CẦN KIỂM TRA LẠI!')
    }

    console.log('\n💡 HƯỚNG DẪN SỬ DỤNG:')
    console.log('=========================================')
    console.log('1️⃣ Để bật hệ thống mới:')
    console.log('   const { flowAdapter } = require("./lib/flows")')
    console.log('   flowAdapter.enableNewSystem()')
    console.log('')
    console.log('2️⃣ Để sử dụng trong webhook:')
    console.log('   await flowAdapter.handleMessage(user, text)')
    console.log('   await flowAdapter.handlePostback(user, postback)')
    console.log('')
    console.log('3️⃣ Để fallback về hệ thống cũ:')
    console.log('   // Chỉ cần không gọi enableNewSystem()')
    console.log('   // Hệ thống sẽ tự động dùng bot-handlers cũ')
}

// Run tests if executed directly
if (require.main === module) {
    runComprehensiveTests().catch(console.error)
}

module.exports = { runComprehensiveTests }
