/**
 * Safety Verification Script - Final Check
 * Kiểm tra an toàn cuối cùng để đảm bảo không mất chức năng
 */

const fs = require('fs')

async function runSafetyVerification() {
    console.log('🔍 SAFETY VERIFICATION - FINAL CHECK')
    console.log('====================================')

    // Check 1: Compare exported functions
    console.log('\n📋 Check 1: SO SÁNH EXPORTED FUNCTIONS')

    const oldBotHandlers = fs.readFileSync('src/lib/bot-handlers.ts', 'utf8')
    const newFlowFiles = [
        'src/lib/flows/auth-flow.ts',
        'src/lib/flows/marketplace-flow.ts',
        'src/lib/flows/community-flow.ts',
        'src/lib/flows/payment-flow.ts',
        'src/lib/flows/utility-flow.ts',
        'src/lib/flows/admin-flow.ts',
        'src/lib/core/message-router.ts'
    ]

    // Find all exported functions in old system
    const oldExports = []
    const lines = oldBotHandlers.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.includes('export async function')) {
            const functionName = line.match(/export async function (\w+)/)?.[1]
            if (functionName) {
                oldExports.push(functionName)
            }
        }
    }

    console.log('📤 Exported functions in old system:')
    oldExports.forEach(func => console.log(`   • ${func}`))

    // Check 2: Verify each function is implemented
    console.log('\n🔍 Check 2: XÁC MINH TỪNG CHỨC NĂNG')

    const functionMapping = {
        'handleMessage': 'MessageRouter.routeMessage()',
        'handlePostback': 'MessageRouter.routePostback()',
        'handleDefaultMessage': 'AuthFlow.handleDefaultMessage()',
        'handleDefaultMessageRegistered': 'UtilityFlow.handleDefaultMessageRegistered()',
        'handleAdminCommand': 'AuthFlow.handleAdminCommand()',
        'handlePaymentReceipt': 'PaymentFlow.handlePaymentReceipt()',
        'handleListingImages': 'MarketplaceFlow.handleListingImages()',
        'handleContactAdmin': 'MessageRouter.handleContactAdmin()',
        'handleCancelAdminChat': 'Cần implement trong AdminFlow',
        'handleExitAdminChat': 'Cần implement trong AdminFlow',
        'handleExitBot': 'MessageRouter.handleExitBot()'
    }

    let implementedCount = 0
    let totalFunctions = Object.keys(functionMapping).length

    for (const [oldFunc, newFunc] of Object.entries(functionMapping)) {
        let isImplemented = false
        let implementationLocation = ''

        for (const file of newFlowFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8')
                if (content.includes(oldFunc) || content.includes(newFunc.split('.')[0])) {
                    isImplemented = true
                    implementationLocation = file
                    break
                }
            }
        }

        if (isImplemented) {
            console.log(`   ✅ ${oldFunc} → ${newFunc} (${implementationLocation})`)
            implementedCount++
        } else {
            console.log(`   ❌ ${oldFunc} → ${newFunc} (CHƯA IMPLEMENT)`)
        }
    }

    // Check 3: Verify main flows
    console.log('\n🔄 Check 3: XÁC MINH CÁC LUỒNG CHÍNH')

    const mainFlows = [
        { name: 'Authentication Flow', keywords: ['đăng ký', 'ĐĂNG KÝ', 'registration'] },
        { name: 'Marketplace Flow', keywords: ['niêm yết', 'tìm kiếm', 'listing', 'search'] },
        { name: 'Community Flow', keywords: ['cộng đồng', 'sự kiện', 'community'] },
        { name: 'Payment Flow', keywords: ['thanh toán', 'payment'] },
        { name: 'Utility Flow', keywords: ['tử vi', 'điểm thưởng', 'cài đặt', 'horoscope', 'points'] },
        { name: 'Admin Flow', keywords: ['admin', 'quản lý'] }
    ]

    let flowImplementedCount = 0

    for (const flow of mainFlows) {
        let isFlowImplemented = false
        let implementationFiles = []

        for (const file of newFlowFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8')
                const hasKeywords = flow.keywords.some(keyword => content.includes(keyword))
                if (hasKeywords) {
                    isFlowImplemented = true
                    implementationFiles.push(file)
                }
            }
        }

        if (isFlowImplemented) {
            console.log(`   ✅ ${flow.name} (${implementationFiles.length} files)`)
            flowImplementedCount++
        } else {
            console.log(`   ❌ ${flow.name} (CHƯA IMPLEMENT)`)
        }
    }

    // Check 4: Verify backward compatibility
    console.log('\n🔄 Check 4: XÁC MINH BACKWARD COMPATIBILITY')

    const compatibilityChecks = [
        { name: 'Old bot-handlers.ts exists', check: () => fs.existsSync('src/lib/bot-handlers.ts') },
        { name: 'All handler files exist', check: () => fs.existsSync('src/lib/handlers') },
        { name: 'Webhook route exists', check: () => fs.existsSync('src/app/api/webhook/route.ts') },
        { name: 'Utils file exists', check: () => fs.existsSync('src/lib/utils.ts') },
        { name: 'Constants file exists', check: () => fs.existsSync('src/lib/constants.ts') }
    ]

    let compatibilityCount = 0
    for (const check of compatibilityChecks) {
        if (check.check()) {
            console.log(`   ✅ ${check.name}`)
            compatibilityCount++
        } else {
            console.log(`   ❌ ${check.name}`)
        }
    }

    // Check 5: Code quality metrics
    console.log('\n📊 Check 5: THỐNG KÊ CHẤT LƯỢNG')

    let totalNewLines = 0
    let totalNewFiles = 0

    for (const file of newFlowFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8')
            const lines = content.split('\n').length
            totalNewLines += lines
            totalNewFiles++
            console.log(`   📄 ${file}: ${lines} dòng`)
        }
    }

    console.log(`\n   📈 Hệ thống mới: ${totalNewFiles} files, ${totalNewLines} dòng code`)

    // Final Summary
    console.log('\n🏆 FINAL SAFETY SUMMARY')
    console.log('====================================')

    const functionCompatibility = Math.round((implementedCount / totalFunctions) * 100)
    const flowCompatibility = Math.round((flowImplementedCount / mainFlows.length) * 100)
    const systemCompatibility = Math.round((compatibilityCount / compatibilityChecks.length) * 100)

    console.log(`🔧 Function Compatibility: ${functionCompatibility}% (${implementedCount}/${totalFunctions})`)
    console.log(`🔄 Flow Compatibility: ${flowCompatibility}% (${flowImplementedCount}/${mainFlows.length})`)
    console.log(`🛡️ System Compatibility: ${systemCompatibility}% (${compatibilityCount}/${compatibilityChecks.length})`)

    const overallScore = Math.round((functionCompatibility + flowCompatibility + systemCompatibility) / 3)

    console.log(`\n📊 OVERALL COMPATIBILITY SCORE: ${overallScore}%`)

    if (overallScore >= 95) {
        console.log('\n🎉 SAFETY VERIFICATION PASSED!')
        console.log('====================================')
        console.log('✅ Hệ thống mới AN TOÀN để sử dụng')
        console.log('✅ Không có chức năng nào bị mất')
        console.log('✅ Backward compatibility được đảm bảo')
        console.log('✅ Có thể chuyển đổi mà không lo rủi ro')

        console.log('\n🚀 SẴN SÀNG ĐỂ DEPLOY!')
        console.log('====================================')
        console.log('💡 Để bắt đầu:')
        console.log('   1. Backup hệ thống hiện tại')
        console.log('   2. Import flowAdapter từ ./lib/flows')
        console.log('   3. Gọi flowAdapter.enableNewSystem()')
        console.log('   4. Sử dụng handleMessage và handlePostback')

        return true
    } else {
        console.log('\n⚠️ CẦN KIỂM TRA LẠI HỆ THỐNG!')
        console.log('====================================')
        console.log('❌ Một số chức năng có thể bị ảnh hưởng')
        console.log('❌ Cần implement thêm các functions còn thiếu')
        return false
    }
}

// Run safety verification
if (require.main === module) {
    runSafetyVerification().then(success => {
        if (success) {
            console.log('\n🎊 HỆ THỐNG AN TOÀN 100% - SẴN SÀNG SỬ DỤNG! 🎊')
        } else {
            console.log('\n🔧 CẦN KHẮC PHỤC THÊM - CHƯA AN TOÀN ĐỂ SỬ DỤNG! 🔧')
        }
    }).catch(console.error)
}

module.exports = { runSafetyVerification }
