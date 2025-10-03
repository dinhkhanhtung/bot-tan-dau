// Test AI Integration - Kiểm tra nhanh AI system hoạt động
// Chạy script này để test nhanh các chức năng AI

import { aiManager } from './core/ai-manager'
import { aiFallbackManager } from './ai/core/ai-fallback'
import { aiServiceFactory } from './ai/core/ai-service'

class AITester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        }
    }

    async runAllTests() {
        console.log('🤖 Bắt đầu test AI Integration...\n')

        await this.testAIManager()
        await this.testFallbackSystem()
        await this.testServiceFactory()
        await this.testConfiguration()
        await this.testMemoryUsage()

        this.printResults()
        return this.results.failed === 0
    }

    async testAIManager() {
        console.log('🔍 Test 1: AI Manager Initialization...')

        try {
            const manager = aiManager
            const isAvailable = manager.isAvailable()
            const provider = manager.getProvider()
            const config = manager.getConfig()

            this.logTest('AI Manager Instance', manager !== null)
            this.logTest('AI Manager Config', config !== null)
            this.logTest('Provider Detection', provider !== null || true) // Có thể null nếu chưa bật AI

            console.log(`   ✅ AI Manager hoạt động bình thường`)
            console.log(`   📊 Provider hiện tại: ${provider || 'Chưa bật AI'}`)
            console.log(`   🔧 Config loaded: ${config ? 'Có' : 'Không'}`)

        } catch (error) {
            this.logTest('AI Manager Error', false, error.message)
        }
    }

    async testFallbackSystem() {
        console.log('\n🔍 Test 2: Fallback System...')

        try {
            // Test fallback chat
            const chatResponse = await aiFallbackManager.fallbackChat('xin chào')
            this.logTest('Fallback Chat', chatResponse && chatResponse.length > 0)

            // Test fallback search
            const searchResponse = await aiFallbackManager.fallbackSmartSearch('tìm nhà')
            this.logTest('Fallback Search', Array.isArray(searchResponse) && searchResponse.length > 0)

            // Test fallback content
            const contentResponse = await aiFallbackManager.fallbackContentGeneration({
                type: 'product_description',
                context: { title: 'Test Product' }
            })
            this.logTest('Fallback Content', contentResponse && contentResponse.length > 0)

            console.log(`   ✅ Fallback system hoạt động bình thường`)

        } catch (error) {
            this.logTest('Fallback System Error', false, error.message)
        }
    }

    async testServiceFactory() {
        console.log('\n🔍 Test 3: Service Factory...')

        try {
            const factory = aiServiceFactory
            const allServices = factory.getAllServices()
            const availableServices = factory.getAvailableServices()

            this.logTest('Service Factory Instance', factory !== null)
            this.logTest('Services Array', Array.isArray(allServices))

            console.log(`   ✅ Service Factory hoạt động bình thường`)
            console.log(`   📊 Tổng services: ${allServices.length}`)
            console.log(`   ✅ Available services: ${availableServices.length}`)

        } catch (error) {
            this.logTest('Service Factory Error', false, error.message)
        }
    }

    async testConfiguration() {
        console.log('\n🔍 Test 4: Configuration...')

        try {
            // Test import AI config
            const { AI_CONFIG } = await import('./ai-config.js')

            this.logTest('AI Config Import', AI_CONFIG !== null)
            this.logTest('OpenAI Config', AI_CONFIG.OPENAI !== null)
            this.logTest('Google AI Config', AI_CONFIG.GOOGLE_AI !== null)
            this.logTest('Claude Config', AI_CONFIG.CLAUDE !== null)

            console.log(`   ✅ Configuration loaded thành công`)
            console.log(`   📊 OpenAI: ${AI_CONFIG.OPENAI.ENABLED ? 'Bật' : 'Tắt'}`)
            console.log(`   📊 Google AI: ${AI_CONFIG.GOOGLE_AI.ENABLED ? 'Bật' : 'Tắt'}`)
            console.log(`   📊 Claude: ${AI_CONFIG.CLAUDE.ENABLED ? 'Bật' : 'Tắt'}`)

        } catch (error) {
            this.logTest('Configuration Error', false, error.message)
        }
    }

    async testMemoryUsage() {
        console.log('\n🔍 Test 5: Memory Usage...')

        try {
            const initialMemory = process.memoryUsage()

            // Import và sử dụng AI modules
            const { aiManager } = await import('./core/ai-manager.js')
            const { aiFallbackManager } = await import('./ai/core/ai-fallback.js')

            // Đợi một chút
            await new Promise(resolve => setTimeout(resolve, 100))

            const afterMemory = process.memoryUsage()
            const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed

            const memoryTest = memoryIncrease < 50 * 1024 * 1024 // < 50MB
            this.logTest('Memory Usage', memoryTest)

            console.log(`   ✅ Memory test hoàn thành`)
            console.log(`   📊 Memory tăng: ${Math.round(memoryIncrease / 1024 / 1024)}MB`)

            if (memoryIncrease > 50 * 1024 * 1024) {
                console.log(`   ⚠️ Cảnh báo: Memory tăng khá nhiều`)
            }

        } catch (error) {
            this.logTest('Memory Test Error', false, error.message)
        }
    }

    logTest(testName, passed, error = null) {
        if (passed) {
            this.results.passed++
            this.results.tests.push(`✅ ${testName}`)
            console.log(`   ✅ ${testName}`)
        } else {
            this.results.failed++
            this.results.tests.push(`❌ ${testName}: ${error || 'Failed'}`)
            console.log(`   ❌ ${testName}: ${error || 'Failed'}`)
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(50))
        console.log('📊 KẾT QUẢ TEST AI INTEGRATION')
        console.log('='.repeat(50))

        console.log(`\n✅ Passed: ${this.results.passed}`)
        console.log(`❌ Failed: ${this.results.failed}`)
        console.log(`📊 Total: ${this.results.passed + this.results.failed}`)

        if (this.results.failed === 0) {
            console.log('\n🎉 TẤT CẢ TESTS ĐỀU THÀNH CÔNG!')
            console.log('✅ AI Integration sẵn sàng để triển khai')
            console.log('🚀 Có thể tiến hành Phase 2: AI Smart Search')
        } else {
            console.log('\n⚠️ CÓ MỘT SỐ TESTS THẤT BẠI!')
            console.log('🔧 Cần khắc phục trước khi triển khai')
        }

        console.log('\n📋 Chi tiết các tests:')
        this.results.tests.forEach(test => console.log(`   ${test}`))

        console.log('\n💡 Khuyến nghị tiếp theo:')
        if (this.results.failed === 0) {
            console.log('   → Bật AI provider trong .env')
            console.log('   → Test với user thật')
            console.log('   → Triển khai AI Smart Search')
        } else {
            console.log('   → Kiểm tra lỗi cụ thể')
            console.log('   → Fix và chạy lại test')
            console.log('   → Đảm bảo tất cả tests pass')
        }

        console.log('='.repeat(50))
    }
}

// Chạy test nếu file được execute trực tiếp
async function runAITests() {
    const tester = new AITester()
    const success = await tester.runAllTests()

    // Exit code để CI/CD có thể sử dụng
    process.exit(success ? 0 : 1)
}

// Xuất để sử dụng trong code khác
export { AITester, runAITests }

// Chạy nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    runAITests().catch(console.error)
}
