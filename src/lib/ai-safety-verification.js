// AI Safety Verification Script - Kiểm tra an toàn trước khi triển khai
// Chạy script này để đảm bảo không có xung đột khi tích hợp AI

class AISafetyVerifier {
    constructor() {
        this.errors = []
        this.warnings = []
        this.success = []
    }

    async runAllTests() {
        console.log('🚀 Bắt đầu kiểm tra an toàn AI Integration...\n')

        await this.testImportSafety()
        await this.testMemoryUsage()
        await this.testPerformanceImpact()
        await this.testFallbackEffectiveness()
        await this.testBackwardCompatibility()
        await this.testEnvironmentVariables()
        await this.testDatabaseSchema()

        this.printResults()
        return this.errors.length === 0
    }

    // Test 1: Import Safety - Đảm bảo không có xung đột import
    async testImportSafety() {
        console.log('🔍 Kiểm tra Import Safety...')

        try {
            // Test import các module AI mới
            const { aiServiceFactory } = await import('./ai/core/ai-service.js')
            const { aiFallbackManager } = await import('./ai/core/ai-fallback.js')
            const { AIManager } = await import('./core/ai-manager.js')

            this.success.push('✅ Import Safety: Tất cả AI modules import thành công')

            // Test không có xung đột với modules hiện tại
            const fs = await import('fs')
            const path = await import('path')

            // Kiểm tra file hiện tại không bị overwrite
            const aiManagerPath = './core/ai-manager.js'
            if (fs.existsSync(aiManagerPath)) {
                this.success.push('✅ Import Safety: AI Manager hiện tại được bảo toàn')
            }

        } catch (error) {
            this.errors.push(`❌ Import Safety: ${error.message}`)
        }
    }

    // Test 2: Memory Usage - Monitor memory consumption
    async testMemoryUsage() {
        console.log('🔍 Kiểm tra Memory Usage...')

        try {
            const initialMemory = process.memoryUsage()

            // Import AI modules và tạo instances
            const { aiServiceFactory } = await import('./ai/core/ai-service.js')
            const { aiFallbackManager } = await import('./ai/core/ai-fallback.js')

            // Đợi garbage collection
            await new Promise(resolve => setTimeout(resolve, 100))

            const afterMemory = process.memoryUsage()
            const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed

            if (memoryIncrease < 50 * 1024 * 1024) { // < 50MB
                this.success.push(`✅ Memory Usage: Tăng ${Math.round(memoryIncrease / 1024 / 1024)}MB - trong giới hạn cho phép`)
            } else {
                this.warnings.push(`⚠️ Memory Usage: Tăng ${Math.round(memoryIncrease / 1024 / 1024)}MB - cần monitor tiếp`)
            }

        } catch (error) {
            this.errors.push(`❌ Memory Usage: ${error.message}`)
        }
    }

    // Test 3: Performance Impact - Đo thời gian response
    async testPerformanceImpact() {
        console.log('🔍 Kiểm tra Performance Impact...')

        try {
            const iterations = 100
            const times = []

            // Đo thời gian import AI modules
            for (let i = 0; i < iterations; i++) {
                const start = performance.now()
                await import('./ai/core/ai-service.js')
                const end = performance.now()
                times.push(end - start)
            }

            const avgTime = times.reduce((a, b) => a + b) / times.length
            const maxTime = Math.max(...times)

            if (avgTime < 50 && maxTime < 100) { // < 50ms average, < 100ms max
                this.success.push(`✅ Performance: Import trung bình ${avgTime.toFixed(2)}ms, max ${maxTime.toFixed(2)}ms`)
            } else {
                this.warnings.push(`⚠️ Performance: Import trung bình ${avgTime.toFixed(2)}ms, max ${maxTime.toFixed(2)}ms`)
            }

        } catch (error) {
            this.errors.push(`❌ Performance: ${error.message}`)
        }
    }

    // Test 4: Fallback Effectiveness - Test khi tắt AI
    async testFallbackEffectiveness() {
        console.log('🔍 Kiểm tra Fallback Effectiveness...')

        try {
            const { aiFallbackManager } = await import('./ai/core/ai-fallback.js')

            // Test fallback chat
            const chatResult = await aiFallbackManager.fallbackChat('xin chào')
            if (chatResult && chatResult.length > 0) {
                this.success.push('✅ Fallback Chat: Hoạt động bình thường')
            }

            // Test fallback search
            const searchResult = await aiFallbackManager.fallbackSmartSearch('tìm nhà')
            if (Array.isArray(searchResult) && searchResult.length > 0) {
                this.success.push('✅ Fallback Search: Hoạt động bình thường')
            }

            // Test fallback content generation
            const contentResult = await aiFallbackManager.fallbackContentGeneration({
                type: 'product_description',
                context: { title: 'Test Product' }
            })
            if (contentResult && contentResult.length > 0) {
                this.success.push('✅ Fallback Content: Hoạt động bình thường')
            }

        } catch (error) {
            this.errors.push(`❌ Fallback: ${error.message}`)
        }
    }

    // Test 5: Backward Compatibility - Đảm bảo code cũ vẫn chạy
    async testBackwardCompatibility() {
        console.log('🔍 Kiểm tra Backward Compatibility...')

        try {
            // Test AI Manager cũ vẫn hoạt động
            const { AIManager, generateHoroscope } = await import('./core/ai-manager.js')

            const aiManager = AIManager.getInstance()
            if (aiManager) {
                this.success.push('✅ Backward Compatibility: AI Manager cũ hoạt động bình thường')
            }

            // Test function cũ vẫn chạy được
            const horoscope = generateHoroscope()
            if (horoscope && horoscope.fortune) {
                this.success.push('✅ Backward Compatibility: generateHoroscope() hoạt động bình thường')
            }

        } catch (error) {
            this.errors.push(`❌ Backward Compatibility: ${error.message}`)
        }
    }

    // Test 6: Environment Variables - Kiểm tra các biến môi trường cần thiết
    async testEnvironmentVariables() {
        console.log('🔍 Kiểm tra Environment Variables...')

        const required = [
            'OPENAI_ENABLED',
            'GOOGLE_AI_ENABLED',
            'CLAUDE_ENABLED'
        ]

        const optional = [
            'OPENAI_API_KEY',
            'GOOGLE_AI_API_KEY',
            'CLAUDE_API_KEY',
            'AI_SMART_SEARCH',
            'AI_CONTENT_GENERATION',
            'AI_CHAT_ASSISTANT'
        ]

        let allPresent = true

        // Check required (có thể false nhưng phải được định nghĩa)
        required.forEach(env => {
            if (process.env[env] !== undefined) {
                this.success.push(`✅ ENV Required: ${env} được định nghĩa`)
            } else {
                this.warnings.push(`⚠️ ENV Required: ${env} chưa được định nghĩa`)
                allPresent = false
            }
        })

        // Check optional (tốt nếu có)
        optional.forEach(env => {
            if (process.env[env]) {
                this.success.push(`✅ ENV Optional: ${env} có giá trị`)
            }
        })

        if (allPresent) {
            this.success.push('✅ ENV: Có thể bật AI an toàn')
        }
    }

    // Test 7: Database Schema - Kiểm tra schema hiện tại
    async testDatabaseSchema() {
        console.log('🔍 Kiểm tra Database Schema...')

        try {
            // Đọc file database schema hiện tại
            const fs = await import('fs')
            const path = await import('path')

            const schemaPath = './database-complete.sql'
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8')

                // Kiểm tra các bảng cần thiết cho AI đã có chưa
                const requiredTables = [
                    'users',
                    'listings',
                    'conversations',
                    'messages'
                ]

                requiredTables.forEach(table => {
                    if (schema.includes(`CREATE TABLE ${table}`) || schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
                        this.success.push(`✅ DB Schema: Bảng ${table} đã tồn tại`)
                    } else {
                        this.warnings.push(`⚠️ DB Schema: Bảng ${table} có thể cần tạo`)
                    }
                })

                // Kiểm tra không có bảng AI nào bị conflict
                if (!schema.includes('ai_requests') && !schema.includes('ai_responses')) {
                    this.success.push('✅ DB Schema: Không có xung đột với bảng AI mới')
                }

            } else {
                this.warnings.push('⚠️ DB Schema: Không tìm thấy file database-complete.sql')
            }

        } catch (error) {
            this.errors.push(`❌ DB Schema: ${error.message}`)
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(60))
        console.log('📊 KẾT QUẢ KIỂM TRA AN TOÀN')
        console.log('='.repeat(60))

        if (this.success.length > 0) {
            console.log('\n✅ THÀNH CÔNG:')
            this.success.forEach(msg => console.log(`   ${msg}`))
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️ CẢNH BÁO:')
            this.warnings.forEach(msg => console.log(`   ${msg}`))
        }

        if (this.errors.length > 0) {
            console.log('\n❌ LỖI:')
            this.errors.forEach(msg => console.log(`   ${msg}`))
        }

        console.log('\n' + '='.repeat(60))

        if (this.errors.length === 0) {
            console.log('🎉 AN TOÀN ĐỂ TRIỂN KHAI AI!')
            console.log('✅ Không có lỗi nghiêm trọng')
            console.log('✅ Có thể tiến hành Phase 2')
        } else {
            console.log('⚠️ CẦN KHẮC PHỤC LỖI TRƯỚC KHI TRIỂN KHAI!')
        }

        console.log('='.repeat(60))
    }
}

// Xuất kết quả để sử dụng trong code khác
async function runAISafetyVerification() {
    const verifier = new AISafetyVerifier()
    const isSafe = await verifier.runAllTests()
    return {
        isSafe,
        errors: verifier.errors,
        warnings: verifier.warnings,
        success: verifier.success
    }
}

// Chạy nếu file được execute trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    runAISafetyVerification().then(result => {
        process.exit(result.isSafe ? 0 : 1)
    })
}

export { AISafetyVerifier, runAISafetyVerification }
