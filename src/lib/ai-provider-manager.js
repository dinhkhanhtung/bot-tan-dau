// AI Provider Manager - Quản lý việc switch giữa các AI providers
// Chạy script này để dễ dàng thay đổi AI provider mà không cần redeploy

import { AI_CONFIG } from '../ai-config.js'

class AIProviderManager {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI',
                type: 'gpt',
                enabled: AI_CONFIG.OPENAI.ENABLED,
                apiKey: AI_CONFIG.OPENAI.API_KEY,
                model: AI_CONFIG.OPENAI.MODEL,
                priority: 3,
                description: 'GPT-3.5/4 - Trả lời tự nhiên, sáng tạo'
            },
            google: {
                name: 'Google AI',
                type: 'gemini',
                enabled: AI_CONFIG.GOOGLE_AI.ENABLED,
                apiKey: AI_CONFIG.GOOGLE_AI.API_KEY,
                model: AI_CONFIG.GOOGLE_AI.MODEL,
                priority: 2,
                description: 'Gemini Pro - Cân bằng tốc độ và chất lượng'
            },
            claude: {
                name: 'Claude',
                type: 'anthropic',
                enabled: AI_CONFIG.CLAUDE.ENABLED,
                apiKey: AI_CONFIG.CLAUDE.API_KEY,
                model: AI_CONFIG.CLAUDE.MODEL,
                priority: 1,
                description: 'Claude 3 - An toàn và hữu ích'
            }
        }
    }

    // Hiển thị trạng thái hiện tại
    showCurrentStatus() {
        console.log('\n📊 TRẠNG THÁI AI PROVIDERS HIỆN TẠI')
        console.log('='.repeat(60))

        Object.entries(this.providers).forEach(([key, provider]) => {
            const status = provider.enabled ? '✅ BẬT' : '❌ TẮT'
            const priority = provider.priority
            console.log(`${status} ${provider.name} (${key}) - Priority: ${priority}`)
            console.log(`   Model: ${provider.model}`)
            console.log(`   Type: ${provider.type}`)
            console.log(`   Description: ${provider.description}`)
            console.log(`   API Key: ${provider.apiKey ? '✅ Có' : '❌ Thiếu'}`)
            console.log('')
        })

        // Đưa ra khuyến nghị
        const activeProviders = Object.entries(this.providers).filter(([_, p]) => p.enabled)
        if (activeProviders.length === 0) {
            console.log('⚠️  KHÔNG CÓ AI PROVIDER NÀO ĐƯỢC BẬT!')
        } else {
            console.log(`✅ Có ${activeProviders.length} provider đang hoạt động`)
        }
    }

    // Switch sang provider khác
    async switchToProvider(providerName) {
        const provider = this.providers[providerName]
        if (!provider) {
            console.log(`❌ Provider "${providerName}" không tồn tại!`)
            console.log('Các provider có sẵn: openai, google, claude')
            return false
        }

        if (!provider.apiKey) {
            console.log(`❌ Provider "${providerName}" thiếu API key!`)
            console.log(`Vui lòng thêm ${provider.name.toUpperCase()}_API_KEY vào .env`)
            return false
        }

        console.log(`🔄 Đang chuyển sang ${provider.name}...`)

        // Logic để switch provider sẽ được implement trong AI Manager
        // Ở đây chỉ là hiển thị hướng dẫn

        console.log(`✅ Đã chuyển sang ${provider.name}`)
        console.log(`📝 Bạn cần cập nhật các biến môi trường sau:`)
        console.log(`   ${providerName.toUpperCase()}_ENABLED=true`)
        console.log(`   Các provider khác _ENABLED=false`)

        return true
    }

    // Bật nhiều providers cùng lúc
    async enableMultipleProviders(providerNames) {
        console.log(`🔄 Đang bật ${providerNames.length} providers...`)

        for (const name of providerNames) {
            const provider = this.providers[name]
            if (provider && provider.apiKey) {
                console.log(`✅ ${provider.name}: SẴN SÀNG`)
            } else {
                console.log(`❌ ${provider.name}: THIẾU API KEY`)
            }
        }

        console.log(`📝 Bạn cần cập nhật các biến môi trường:`)
        providerNames.forEach(name => {
            console.log(`   ${name.toUpperCase()}_ENABLED=true`)
        })
    }

    // Tạo hướng dẫn Environment Variables cho Vercel
    generateVercelEnvGuide() {
        console.log('\n🌐 HƯỚNG DẪN THÊM ENVIRONMENT VARIABLES TRÊN VERCEL')
        console.log('='.repeat(70))

        console.log('\n📋 BƯỚC 1: Truy cập Vercel Dashboard')
        console.log('   https://vercel.com/dashboard')
        console.log('   Chọn project của bạn')

        console.log('\n📋 BƯỚC 2: Vào Settings → Environment Variables')
        console.log('   Click "Add New" để thêm từng biến')

        console.log('\n📋 BƯỚC 3: Thêm các biến sau:')

        Object.entries(this.providers).forEach(([key, provider]) => {
            console.log(`\n   🔑 ${provider.name} Variables:`)
            console.log(`   • ${key.toUpperCase()}_ENABLED = ${provider.enabled ? 'true' : 'false'}`)
            console.log(`   • ${key.toUpperCase()}_API_KEY = [API key của bạn]`)
            console.log(`   • ${key.toUpperCase()}_MODEL = ${provider.model}`)
            console.log(`   • ${key.toUpperCase()}_MAX_TOKENS = 1000`)
            console.log(`   • ${key.toUpperCase()}_TEMPERATURE = 0.7`)
        })

        console.log(`\n   🔑 AI Features:`)
        console.log(`   • AI_SMART_SEARCH = true`)
        console.log(`   • AI_CONTENT_GENERATION = true`)
        console.log(`   • AI_CHAT_ASSISTANT = true`)
        console.log(`   • AI_RECOMMENDATIONS = true`)
        console.log(`   • AI_AUTO_REPLY = false`)

        console.log(`\n   🔑 AI Limits:`)
        console.log(`   • AI_DAILY_LIMIT = 100`)
        console.log(`   • AI_REQUEST_TIMEOUT = 30000`)
        console.log(`   • AI_MAX_RETRIES = 3`)

        console.log('\n📋 BƯỚC 4: Redeploy')
        console.log('   Sau khi thêm xong, click "Redeploy" để áp dụng')

        console.log('\n📋 BƯỚC 5: Kiểm tra')
        console.log('   Truy cập trang web và test AI hoạt động')
    }

    // Tạo template .env cho các providers
    generateEnvTemplate() {
        console.log('\n📝 TEMPLATE .ENV CHO CÁC AI PROVIDERS')
        console.log('='.repeat(50))
        console.log('# Copy đoạn này vào file .env của bạn')
        console.log('')

        Object.entries(this.providers).forEach(([key, provider]) => {
            console.log(`# ${provider.name} Configuration`)
            console.log(`${key.toUpperCase()}_ENABLED=false`)
            console.log(`${key.toUpperCase()}_API_KEY=your_${key}_api_key_here`)
            console.log(`${key.toUpperCase()}_MODEL=${provider.model}`)
            console.log(`${key.toUpperCase()}_MAX_TOKENS=1000`)
            console.log(`${key.toUpperCase()}_TEMPERATURE=0.7`)
            console.log('')
        })

        console.log('# AI Features Toggle')
        console.log('AI_SMART_SEARCH=true')
        console.log('AI_CONTENT_GENERATION=true')
        console.log('AI_CHAT_ASSISTANT=true')
        console.log('AI_RECOMMENDATIONS=true')
        console.log('AI_AUTO_REPLY=false')
        console.log('')
        console.log('# AI Limits')
        console.log('AI_DAILY_LIMIT=100')
        console.log('AI_REQUEST_TIMEOUT=30000')
        console.log('AI_MAX_RETRIES=3')
    }

    // So sánh các providers
    compareProviders() {
        console.log('\n⚖️  SO SÁNH CÁC AI PROVIDERS')
        console.log('='.repeat(60))

        const comparison = {
            'Tên': ['OpenAI GPT', 'Google Gemini', 'Claude'],
            'Model': ['gpt-3.5-turbo', 'gemini-pro', 'claude-3-sonnet'],
            'Tốc độ': ['Nhanh', 'Rất nhanh', 'Trung bình'],
            'Chất lượng': ['Cao', 'Tốt', 'Rất cao'],
            'Chi phí (/1K tokens)': ['$0.002', '$0.001', '$0.008'],
            'Độ an toàn': ['Cao', 'Trung bình', 'Rất cao'],
            'Tính sáng tạo': ['Rất cao', 'Cao', 'Trung bình'],
            'Khuyến nghị': ['Phát triển', 'Sản xuất', 'An toàn']
        }

        console.log('Tính năng'.padEnd(15) + 'GPT-3.5'.padEnd(15) + 'Gemini Pro'.padEnd(15) + 'Claude 3'.padEnd(15))
        console.log('─'.repeat(60))

        Object.entries(comparison).forEach(([feature, values]) => {
            console.log(
                feature.padEnd(15) +
                values[0].padEnd(15) +
                values[1].padEnd(15) +
                values[2].padEnd(15)
            )
        })

        console.log('\n💡 KHUYẾN NGHỊ:')
        console.log('• Phát triển: Dùng GPT để test tính năng')
        console.log('• Sản xuất: Dùng Gemini để cân bằng chi phí/hiệu suất')
        console.log('• Doanh nghiệp: Dùng Claude để đảm bảo an toàn')
    }
}

// CLI Interface
async function main() {
    const manager = new AIProviderManager()
    const command = process.argv[2]

    switch (command) {
        case 'status':
            manager.showCurrentStatus()
            break
        case 'switch':
            const provider = process.argv[3]
            if (provider) {
                await manager.switchToProvider(provider)
            } else {
                console.log('❌ Vui lòng chỉ định provider: openai, google, hoặc claude')
            }
            break
        case 'enable':
            const providers = process.argv.slice(3)
            if (providers.length > 0) {
                await manager.enableMultipleProviders(providers)
            } else {
                console.log('❌ Vui lòng chỉ định providers: openai google claude')
            }
            break
        case 'vercel':
            manager.generateVercelEnvGuide()
            break
        case 'template':
            manager.generateEnvTemplate()
            break
        case 'compare':
            manager.compareProviders()
            break
        default:
            console.log('🤖 AI Provider Manager')
            console.log('')
            console.log('Các lệnh có sẵn:')
            console.log('  status      - Xem trạng thái hiện tại')
            console.log('  switch <p>  - Chuyển sang provider (openai/google/claude)')
            console.log('  enable <p>  - Bật nhiều providers cùng lúc')
            console.log('  vercel      - Hướng dẫn thêm ENV trên Vercel')
            console.log('  template    - Tạo template .env')
            console.log('  compare     - So sánh các providers')
            console.log('')
            console.log('Ví dụ:')
            console.log('  node ai-provider-manager.js status')
            console.log('  node ai-provider-manager.js switch openai')
            console.log('  node ai-provider-manager.js enable openai google')
            console.log('  node ai-provider-manager.js vercel')
    }
}

// Xuất class để sử dụng trong code khác
export { AIProviderManager }

// Chạy nếu file được execute trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error)
}
