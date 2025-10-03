import { AI_CONFIG, getActiveAIProvider, isAIEnabled, getAIConfig } from '../ai-config'
import { aiServiceFactory, IAIService } from '../ai/core/ai-service'
import { aiFallbackManager, aiCircuitBreaker, withAIFallback } from '../ai/core/ai-fallback'
import {
    SearchContext,
    ContentGenerationRequest,
    ChatContext,
    RecommendationRequest,
    AIUsageStats,
    AIMonitoringEvent
} from '../ai/types/ai-types'

// Enhanced AI Manager - Tích hợp với hệ thống AI mới
export class AIManager {
    private static instance: AIManager
    private activeProvider: string | null = null
    private aiServices: IAIService[] = []

    private constructor() {
        this.activeProvider = getActiveAIProvider()
        this.initializeAIServices()
    }

    static getInstance(): AIManager {
        if (!AIManager.instance) {
            AIManager.instance = new AIManager()
        }
        return AIManager.instance
    }

    /**
     * Initialize AI services based on configuration
     */
    private initializeAIServices(): void {
        // Register available AI services
        if (AI_CONFIG.OPENAI.ENABLED && AI_CONFIG.OPENAI.API_KEY) {
            // Will implement OpenAI service later
            console.log('[AI-Manager] OpenAI service registered')
        }

        if (AI_CONFIG.GOOGLE_AI.ENABLED && AI_CONFIG.GOOGLE_AI.API_KEY) {
            // Will implement Google AI service later
            console.log('[AI-Manager] Google AI service registered')
        }

        if (AI_CONFIG.CLAUDE.ENABLED && AI_CONFIG.CLAUDE.API_KEY) {
            // Will implement Claude service later
            console.log('[AI-Manager] Claude service registered')
        }
    }

    /**
     * Check if AI is available with fallback support
     */
    isAvailable(): boolean {
        const basicCheck = isAIEnabled() && this.activeProvider !== null

        if (!basicCheck) {
            return false
        }

        // Check if any AI service is available
        const availableServices = aiServiceFactory.getAvailableServices()
        return availableServices.length > 0
    }

    /**
     * Get current AI provider
     */
    getProvider(): string | null {
        return this.activeProvider
    }

    /**
     * Get AI configuration
     */
    getConfig(): any {
        return getAIConfig()
    }

    /**
     * Get best available AI service
     */
    async getBestService(): Promise<IAIService | null> {
        return await aiServiceFactory.getBestAvailableService()
    }

    /**
     * Generate AI response for chat
     */
    async generateChatResponse(message: string, context?: any): Promise<string | null> {
        if (!this.isAvailable()) {
            return null
        }

        try {
            switch (this.activeProvider) {
                case 'openai':
                    return await this.callOpenAI(message, context)
                case 'google':
                    return await this.callGoogleAI(message, context)
                case 'claude':
                    return await this.callClaude(message, context)
                default:
                    return null
            }
        } catch (error) {
            console.error('Error generating AI response:', error)
            return null
        }
    }

    /**
     * Generate smart search results
     */
    async generateSmartSearch(query: string, category?: string): Promise<string | null> {
        if (!this.isAvailable() || !AI_CONFIG.FEATURES.SMART_SEARCH) {
            return null
        }

        const prompt = `Tìm kiếm thông minh cho: "${query}" trong danh mục ${category || 'tất cả'}.
        Hãy đưa ra gợi ý tìm kiếm phù hợp và kết quả có thể có.`

        return await this.generateChatResponse(prompt)
    }

    /**
     * Generate content suggestions
     */
    async generateContentSuggestion(type: string, context: any): Promise<string | null> {
        if (!this.isAvailable() || !AI_CONFIG.FEATURES.CONTENT_GENERATION) {
            return null
        }

        const prompt = `Tạo nội dung ${type} cho: ${JSON.stringify(context)}`
        return await this.generateChatResponse(prompt)
    }

    /**
     * Generate personalized recommendations
     */
    async generateRecommendations(userProfile: any, history: any[]): Promise<string | null> {
        if (!this.isAvailable() || !AI_CONFIG.FEATURES.RECOMMENDATIONS) {
            return null
        }

        const prompt = `Đưa ra gợi ý cá nhân hóa cho người dùng có thông tin: ${JSON.stringify(userProfile)}
        dựa trên lịch sử: ${JSON.stringify(history)}`

        return await this.generateChatResponse(prompt)
    }

    /**
     * Generate auto reply suggestion
     */
    async generateAutoReply(message: string, context?: any): Promise<string | null> {
        if (!this.isAvailable() || !AI_CONFIG.FEATURES.AUTO_REPLY) {
            return null
        }

        const prompt = `Tạo câu trả lời tự động phù hợp cho tin nhắn: "${message}"`
        return await this.generateChatResponse(prompt)
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(message: string, context?: any): Promise<string> {
        const config = AI_CONFIG.OPENAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.API_KEY}`
            },
            body: JSON.stringify({
                model: config.MODEL,
                messages: [
                    { role: 'system', content: 'Bạn là trợ lý AI cho cộng đồng Tân Dậu - Hỗ Trợ Chéo.' },
                    { role: 'user', content: message }
                ],
                max_tokens: config.MAX_TOKENS,
                temperature: config.TEMPERATURE
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content || 'Không thể tạo phản hồi'
    }

    /**
     * Call Google AI API
     */
    private async callGoogleAI(message: string, context?: any): Promise<string> {
        const config = AI_CONFIG.GOOGLE_AI
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.MODEL}:generateContent?key=${config.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: message
                    }]
                }],
                generationConfig: {
                    temperature: config.TEMPERATURE,
                    maxOutputTokens: config.MAX_TOKENS
                }
            })
        })

        if (!response.ok) {
            throw new Error(`Google AI API error: ${response.status}`)
        }

        const data = await response.json()
        return data.candidates[0]?.content?.parts[0]?.text || 'Không thể tạo phản hồi'
    }

    /**
     * Call Claude API
     */
    private async callClaude(message: string, context?: any): Promise<string> {
        const config = AI_CONFIG.CLAUDE

        if (!config.API_KEY) {
            throw new Error('Claude API key not configured')
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.API_KEY,
                'anthropic-version': '2023-06-01'
            } as HeadersInit,
            body: JSON.stringify({
                model: config.MODEL,
                messages: [
                    { role: 'user', content: message }
                ],
                max_tokens: config.MAX_TOKENS,
                temperature: config.TEMPERATURE
            })
        })

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`)
        }

        const data = await response.json()
        return data.content[0]?.text || 'Không thể tạo phản hồi'
    }

    /**
     * Enhanced horoscope generation with AI
     */
    async generateAIHoroscope(userProfile?: any): Promise<any> {
        if (!this.isAvailable()) {
            // Fallback to simple random generation
            return this.generateSimpleHoroscope()
        }

        try {
            const prompt = `Tạo tử vi hàng ngày cho tuổi Tân Dậu (1981) với phong cách thân thiện, gần gũi.
            ${userProfile ? `Dựa trên thông tin người dùng: ${JSON.stringify(userProfile)}` : ''}
            Hãy tạo tử vi chi tiết về tài lộc, tình cảm, sức khỏe, sự nghiệp và lời khuyên.`

            const aiResponse = await this.generateChatResponse(prompt)

            if (aiResponse) {
                return this.parseAIHoroscope(aiResponse)
            } else {
                return this.generateSimpleHoroscope()
            }
        } catch (error) {
            console.error('Error generating AI horoscope:', error)
            return this.generateSimpleHoroscope()
        }
    }

    /**
     * Fallback simple horoscope generation
     */
    private generateSimpleHoroscope(): any {
        const fortunes = ['Rất tốt', 'Tốt', 'Bình thường', 'Khá tốt']
        const loves = ['Thuận lợi', 'Ổn định', 'Cần chú ý', 'Tốt đẹp']
        const healths = ['Tốt', 'Cần nghỉ ngơi', 'Ổn định', 'Rất tốt']
        const careers = ['Thuận lợi', 'Cẩn thận', 'Ổn định', 'Phát triển']

        const advices = [
            'Hôm nay nên gặp gỡ bạn bè',
            'Nên dành thời gian cho gia đình',
            'Tập thể dục nhẹ nhàng',
            'Nên đầu tư có kế hoạch',
            'Tránh căng thẳng không cần thiết'
        ]

        const colors = ['Vàng', 'Trắng', 'Xanh dương', 'Xanh lá', 'Đỏ']
        const numbers = [1, 6, 8, 3, 9, 5]

        return {
            fortune: fortunes[Math.floor(Math.random() * fortunes.length)],
            love: loves[Math.floor(Math.random() * loves.length)],
            health: healths[Math.floor(Math.random() * healths.length)],
            career: careers[Math.floor(Math.random() * careers.length)],
            advice: advices[Math.floor(Math.random() * advices.length)],
            luckyColor: colors[Math.floor(Math.random() * colors.length)],
            luckyNumber: numbers[Math.floor(Math.random() * numbers.length)]
        }
    }

    /**
     * Parse AI response to horoscope format
     */
    private parseAIHoroscope(aiResponse: string): any {
        // Simple parsing - in real implementation, use better NLP
        return {
            fortune: 'Tốt',
            love: 'Ổn định',
            health: 'Tốt',
            career: 'Thuận lợi',
            advice: aiResponse.substring(0, 100) + '...',
            luckyColor: 'Vàng',
            luckyNumber: 8
        }
    }

    /**
     * Get AI usage statistics
     */
    getUsageStats(): any {
        return {
            provider: this.activeProvider,
            isEnabled: this.isAvailable(),
            features: AI_CONFIG.FEATURES,
            limits: AI_CONFIG.LIMITS
        }
    }

    // === NEW AI SYSTEM METHODS ===

    /**
     * Enhanced Smart Search with fallback support
     */
    async smartSearchEnhanced(context: SearchContext): Promise<string[]> {
        const aiOperation = async () => {
            const service = await this.getBestService()
            if (!service) throw new Error('No AI service available')

            return await service.smartSearch(context)
        }

        const fallbackOperation = async () => {
            return await aiFallbackManager.fallbackSmartSearch(context.query, context)
        }

        try {
            return await withAIFallback(
                aiOperation,
                fallbackOperation,
                'search',
                context
            )
        } catch (error) {
            console.error('[AI-Manager] Smart search failed:', error)
            return fallbackOperation()
        }
    }

    /**
     * Enhanced Content Generation with fallback support
     */
    async generateContentEnhanced(request: ContentGenerationRequest): Promise<string> {
        const aiOperation = async () => {
            const service = await this.getBestService()
            if (!service) throw new Error('No AI service available')

            return await service.generateContent(request)
        }

        const fallbackOperation = async () => {
            return await aiFallbackManager.fallbackContentGeneration(request)
        }

        try {
            return await withAIFallback(
                aiOperation,
                fallbackOperation,
                'content_generation',
                request
            )
        } catch (error) {
            console.error('[AI-Manager] Content generation failed:', error)
            return fallbackOperation()
        }
    }

    /**
     * Enhanced Chat Processing with fallback support
     */
    async processChatEnhanced(context: ChatContext): Promise<string> {
        const aiOperation = async () => {
            const service = await this.getBestService()
            if (!service) throw new Error('No AI service available')

            return await service.processChat(context)
        }

        const fallbackOperation = async () => {
            return await aiFallbackManager.fallbackChat(context.message, context)
        }

        try {
            return await withAIFallback(
                aiOperation,
                fallbackOperation,
                'chat',
                context
            )
        } catch (error) {
            console.error('[AI-Manager] Chat processing failed:', error)
            return fallbackOperation()
        }
    }

    /**
     * Enhanced Recommendations with fallback support
     */
    async generateRecommendationsEnhanced(request: RecommendationRequest): Promise<string[]> {
        const aiOperation = async () => {
            const service = await this.getBestService()
            if (!service) throw new Error('No AI service available')

            return await service.generateRecommendations(request)
        }

        const fallbackOperation = async () => {
            return await aiFallbackManager.fallbackRecommendations(request.userId, request)
        }

        try {
            return await withAIFallback(
                aiOperation,
                fallbackOperation,
                'recommendation',
                request
            )
        } catch (error) {
            console.error('[AI-Manager] Recommendations failed:', error)
            return fallbackOperation()
        }
    }

    /**
     * Get comprehensive AI health status
     */
    async getAIHealthStatus(): Promise<any> {
        const services = aiServiceFactory.getAllServices()
        const healthPromises = services.map(service => service.getHealthStatus())

        try {
            const healthStatuses = await Promise.all(healthPromises)

            return {
                overall: {
                    available: this.isAvailable(),
                    provider: this.activeProvider,
                    totalServices: services.length,
                    availableServices: services.filter(s => s.isAvailable()).length
                },
                services: healthStatuses,
                fallback: {
                    circuitBreaker: {
                        openCircuits: services.filter(s => {
                            const state = aiCircuitBreaker.getCircuitState(s.getProviderName() || 'unknown')
                            return state === 'OPEN'
                        }).length
                    }
                },
                features: AI_CONFIG.FEATURES
            }
        } catch (error) {
            console.error('[AI-Manager] Error getting health status:', error)
            return {
                overall: { available: false, error: (error as Error).message },
                services: [],
                fallback: {},
                features: AI_CONFIG.FEATURES
            }
        }
    }

    /**
     * Log AI monitoring event
     */
    logAIMonitoringEvent(event: AIMonitoringEvent): void {
        // Log to all available services
        const services = aiServiceFactory.getAllServices()
        services.forEach(service => {
            try {
                service.logEvent(event)
            } catch (error) {
                console.error('[AI-Manager] Error logging event:', error)
            }
        })
    }

    /**
     * Force refresh AI services (useful after config changes)
     */
    refreshAIServices(): void {
        this.activeProvider = getActiveAIProvider()
        this.initializeAIServices()
        console.log('[AI-Manager] AI services refreshed')
    }
}

// Export singleton instance
export const aiManager = AIManager.getInstance()

// Export functions for backward compatibility
export function generateHoroscope(): any {
    const fortunes = ['Rất tốt', 'Tốt', 'Bình thường', 'Khá tốt']
    const loves = ['Thuận lợi', 'Ổn định', 'Cần chú ý', 'Tốt đẹp']
    const healths = ['Tốt', 'Cần nghỉ ngơi', 'Ổn định', 'Rất tốt']
    const careers = ['Thuận lợi', 'Cẩn thận', 'Ổn định', 'Phát triển']

    const advices = [
        'Hôm nay nên gặp gỡ bạn bè',
        'Nên dành thời gian cho gia đình',
        'Tập thể dục nhẹ nhàng',
        'Nên đầu tư có kế hoạch',
        'Tránh căng thẳng không cần thiết'
    ]

    const colors = ['Vàng', 'Trắng', 'Xanh dương', 'Xanh lá', 'Đỏ']
    const numbers = [1, 6, 8, 3, 9, 5]

    return {
        fortune: fortunes[Math.floor(Math.random() * fortunes.length)],
        love: loves[Math.floor(Math.random() * loves.length)],
        health: healths[Math.floor(Math.random() * healths.length)],
        career: careers[Math.floor(Math.random() * careers.length)],
        advice: advices[Math.floor(Math.random() * advices.length)],
        luckyColor: colors[Math.floor(Math.random() * colors.length)],
        luckyNumber: numbers[Math.floor(Math.random() * numbers.length)]
    }
}

export { AI_CONFIG, getActiveAIProvider, isAIEnabled, getAIConfig }
