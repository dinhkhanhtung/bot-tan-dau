import { IAIService } from './ai-service'
import { AIError, AIFallbackStrategy, AIRequest, AIResponse } from '../types/ai-types'

// Cơ chế Fallback hoàn hảo - Đảm bảo bot hoạt động khi tắt AI
export class AIFallbackManager {
    private static instance: AIFallbackManager
    private fallbackStrategies = new Map<string, AIFallbackStrategy>()
    private fallbackResponses = new Map<string, any>()

    private constructor() {
        this.initializeDefaultFallbacks()
    }

    static getInstance(): AIFallbackManager {
        if (!AIFallbackManager.instance) {
            AIFallbackManager.instance = new AIFallbackManager()
        }
        return AIFallbackManager.instance
    }

    // Đăng ký chiến lược fallback cho từng loại request
    registerFallbackStrategy(type: string, strategy: AIFallbackStrategy): void {
        this.fallbackStrategies.set(type, strategy)
    }

    // Đăng ký phản hồi fallback mặc định
    registerFallbackResponse(type: string, response: any): void {
        this.fallbackResponses.set(type, response)
    }

    // Thực hiện fallback với retry logic
    async executeWithFallback<T>(
        primaryOperation: () => Promise<T>,
        requestType: string,
        context?: any
    ): Promise<T> {
        const strategy = this.fallbackStrategies.get(requestType)

        if (!strategy) {
            // Nếu không có strategy, thử thực hiện primary operation
            try {
                return await primaryOperation()
            } catch (error) {
                return this.getDefaultFallback(requestType, context)
            }
        }

        let lastError: Error | null = null

        // Thử primary provider
        try {
            return await this.executeWithTimeout(primaryOperation, strategy.timeout)
        } catch (error) {
            lastError = error as Error
            console.log(`[AI-Fallback] Primary failed for ${requestType}:`, error)
        }

        // Thử secondary providers
        for (const secondaryProvider of strategy.secondary) {
            try {
                const result = await this.executeSecondaryProvider(secondaryProvider, context)
                console.log(`[AI-Fallback] Secondary success for ${requestType} using ${secondaryProvider}`)
                return result
            } catch (error) {
                lastError = error as Error
                console.log(`[AI-Fallback] Secondary ${secondaryProvider} failed for ${requestType}:`, error)
            }
        }

        // Nếu tất cả đều thất bại, trả về fallback mặc định
        console.log(`[AI-Fallback] All providers failed for ${requestType}, using default fallback`)
        return this.getDefaultFallback(requestType, context)
    }

    // Fallback cho Smart Search
    async fallbackSmartSearch(query: string, context?: any): Promise<string[]> {
        // Logic tìm kiếm cơ bản không cần AI
        const basicResults = [
            `Kết quả cơ bản cho "${query}"`,
            'Bạn có thể thử tìm kiếm với từ khóa khác',
            'Hoặc chọn danh mục cụ thể để tìm chính xác hơn'
        ]

        // Nếu có context về danh mục, đưa ra gợi ý liên quan
        if (context?.category) {
            basicResults.push(`Gợi ý liên quan đến danh mục ${context.category}`)
        }

        return basicResults
    }

    // Fallback cho Content Generation
    async fallbackContentGeneration(request: any): Promise<string> {
        const templates: Record<string, string> = {
            product_description: `Sản phẩm chất lượng tốt, giá cả hợp lý. Liên hệ để biết thêm chi tiết.`,
            listing_title: `Sản phẩm tốt - ${request.context?.title || 'Không có tiêu đề'}`,
            seo_content: `Nội dung SEO cơ bản cho sản phẩm.`,
            default: `Nội dung được tạo tự động. Vui lòng cung cấp thêm thông tin chi tiết.`
        }

        return templates[request.type as string] || templates.default
    }

    // Fallback cho Chat Assistant
    async fallbackChat(message: string, context?: any): Promise<string> {
        // Phân tích tin nhắn cơ bản để đưa ra phản hồi phù hợp
        const lowerMessage = message.toLowerCase()

        if (lowerMessage.includes('xin chào') || lowerMessage.includes('chào bạn')) {
            return 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?'
        }

        if (lowerMessage.includes('giá') || lowerMessage.includes('bao nhiêu')) {
            return 'Để biết thông tin giá chính xác, bạn có thể xem chi tiết sản phẩm hoặc liên hệ người bán.'
        }

        if (lowerMessage.includes('tìm') || lowerMessage.includes('search')) {
            return 'Bạn muốn tìm sản phẩm gì? Hãy cho tôi biết danh mục hoặc từ khóa để hỗ trợ tìm kiếm.'
        }

        if (lowerMessage.includes('hỗ trợ') || lowerMessage.includes('help')) {
            return 'Tôi có thể hỗ trợ bạn tìm kiếm sản phẩm, tư vấn mua hàng, hoặc trả lời câu hỏi về cộng đồng Tân Dậu.'
        }

        // Phản hồi mặc định hữu ích
        return 'Cảm ơn bạn đã liên hệ! Tôi sẽ hỗ trợ bạn trong khả năng có thể. Bạn có câu hỏi gì cụ thể không?'
    }

    // Fallback cho Recommendations
    async fallbackRecommendations(userId: string, context?: any): Promise<string[]> {
        return [
            'Sản phẩm phổ biến trong cộng đồng',
            'Sản phẩm được đánh giá cao',
            'Sản phẩm mới đăng gần đây',
            'Sản phẩm đang giảm giá',
            'Sản phẩm liên quan đến sở thích của bạn'
        ]
    }

    // Kiểm tra xem có cần fallback không
    shouldUseFallback(service: IAIService, requestType: string): boolean {
        // Nếu service không khả dụng, dùng fallback
        if (!service.isAvailable()) {
            return true
        }

        // Nếu quá tải (queue quá dài), dùng fallback
        if (this.isOverloaded(service)) {
            return true
        }

        // Nếu tỷ lệ lỗi cao, dùng fallback
        if (this.hasHighErrorRate(service)) {
            return true
        }

        return false
    }

    // Private methods
    private async executeWithTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Operation timeout')), timeout)
            )
        ])
    }

    private async executeSecondaryProvider(provider: string, context: any): Promise<any> {
        // Implementation depends on available providers
        // This is a simplified version
        switch (provider) {
            case 'basic_search':
                return this.fallbackSmartSearch(context?.query || '')
            case 'template_content':
                return this.fallbackContentGeneration(context || {})
            case 'rule_based_chat':
                return this.fallbackChat(context?.message || '')
            default:
                throw new Error(`Unknown secondary provider: ${provider}`)
        }
    }

    private getDefaultFallback(requestType: string, context?: any): any {
        const fallbackResponse = this.fallbackResponses.get(requestType)

        if (fallbackResponse) {
            return typeof fallbackResponse === 'function'
                ? fallbackResponse(context)
                : fallbackResponse
        }

        // Fallback mặc định dựa trên loại request
        switch (requestType) {
            case 'search':
                return this.fallbackSmartSearch(context?.query || '')
            case 'content_generation':
                return this.fallbackContentGeneration(context || {})
            case 'chat':
                return this.fallbackChat(context?.message || '')
            case 'recommendation':
                return this.fallbackRecommendations(context?.userId || '')
            default:
                return 'Xin lỗi, hiện tại không thể xử lý yêu cầu của bạn. Vui lòng thử lại sau.'
        }
    }

    private initializeDefaultFallbacks(): void {
        // Đăng ký các fallback mặc định
        this.registerFallbackResponse('search', (context: any) =>
            this.fallbackSmartSearch(context?.query || '')
        )

        this.registerFallbackResponse('content_generation', (context: any) =>
            this.fallbackContentGeneration(context || {})
        )

        this.registerFallbackResponse('chat', (context: any) =>
            this.fallbackChat(context?.message || '')
        )

        this.registerFallbackResponse('recommendation', (context: any) =>
            this.fallbackRecommendations(context?.userId || '')
        )

        // Đăng ký chiến lược fallback mặc định
        this.registerFallbackStrategy('search', {
            primary: 'ai_search',
            secondary: ['basic_search'],
            timeout: 10000,
            maxRetries: 2
        })

        this.registerFallbackStrategy('content_generation', {
            primary: 'ai_content',
            secondary: ['template_content'],
            timeout: 15000,
            maxRetries: 1
        })

        this.registerFallbackStrategy('chat', {
            primary: 'ai_chat',
            secondary: ['rule_based_chat'],
            timeout: 8000,
            maxRetries: 2
        })

        this.registerFallbackStrategy('recommendation', {
            primary: 'ai_recommendation',
            secondary: ['basic_recommendation'],
            timeout: 5000,
            maxRetries: 1
        })
    }

    private isOverloaded(service: IAIService): boolean {
        // Kiểm tra queue size hoặc response time
        // Implementation depends on service monitoring
        return false // Simplified for now
    }

    private hasHighErrorRate(service: IAIService): boolean {
        // Kiểm tra error rate trong thời gian gần đây
        // Implementation depends on service monitoring
        return false // Simplified for now
    }
}

// Cơ chế Circuit Breaker - Tự động tắt AI khi có vấn đề
export class AICircuitBreaker {
    private static instance: AICircuitBreaker
    private failureCount = new Map<string, number>()
    private lastFailureTime = new Map<string, number>()
    private circuitState = new Map<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>()

    private readonly FAILURE_THRESHOLD = 5
    private readonly TIMEOUT = 60000 // 1 minute
    private readonly HALF_OPEN_TIMEOUT = 30000 // 30 seconds

    static getInstance(): AICircuitBreaker {
        if (!AICircuitBreaker.instance) {
            AICircuitBreaker.instance = new AICircuitBreaker()
        }
        return AICircuitBreaker.instance
    }

    async executeWithCircuitBreaker<T>(
        operation: () => Promise<T>,
        provider: string
    ): Promise<T> {
        const state = this.circuitState.get(provider) || 'CLOSED'

        if (state === 'OPEN') {
            if (this.shouldAttemptReset(provider)) {
                this.circuitState.set(provider, 'HALF_OPEN')
            } else {
                throw new Error(`Circuit breaker is OPEN for provider: ${provider}`)
            }
        }

        try {
            const result = await operation()
            this.onSuccess(provider)
            return result
        } catch (error) {
            this.onFailure(provider)
            throw error
        }
    }

    private onSuccess(provider: string): void {
        this.failureCount.set(provider, 0)
        this.circuitState.set(provider, 'CLOSED')
    }

    private onFailure(provider: string): void {
        const currentFailures = this.failureCount.get(provider) || 0
        this.failureCount.set(provider, currentFailures + 1)
        this.lastFailureTime.set(provider, Date.now())

        if (currentFailures >= this.FAILURE_THRESHOLD) {
            this.circuitState.set(provider, 'OPEN')
        }
    }

    private shouldAttemptReset(provider: string): boolean {
        const lastFailure = this.lastFailureTime.get(provider) || 0
        return (Date.now() - lastFailure) >= this.TIMEOUT
    }

    getCircuitState(provider: string): string {
        return this.circuitState.get(provider) || 'CLOSED'
    }

    getFailureCount(provider: string): number {
        return this.failureCount.get(provider) || 0
    }
}

// Utility function để wrap AI calls với fallback
export async function withAIFallback<T>(
    aiOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    requestType: string,
    context?: any
): Promise<T> {
    const fallbackManager = AIFallbackManager.getInstance()

    try {
        return await fallbackManager.executeWithFallback(aiOperation, requestType, context)
    } catch (error) {
        console.log(`[AI-Fallback] AI operation failed, using fallback for ${requestType}`)
        return await fallbackOperation()
    }
}

// Export singleton instances
export const aiFallbackManager = AIFallbackManager.getInstance()
export const aiCircuitBreaker = AICircuitBreaker.getInstance()
