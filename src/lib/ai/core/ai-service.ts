import {
    AIRequest,
    AIResponse,
    AIConfig,
    AIFallbackStrategy,
    SearchContext,
    ContentGenerationRequest,
    ChatContext,
    RecommendationRequest,
    AIUsageStats,
    AIError,
    AIMonitoringEvent,
    AIRequestType
} from '../types/ai-types'

// AI Service Interface - Interface thống nhất cho tất cả AI features
export interface IAIService {
    // Core AI methods
    generateResponse(request: AIRequest): Promise<AIResponse>
    isAvailable(): boolean
    getUsageStats(): Promise<AIUsageStats>
    getProviderName(): string
    getProviderType(): string

    // Feature-specific methods
    smartSearch(context: SearchContext): Promise<string[]>
    generateContent(request: ContentGenerationRequest): Promise<string>
    processChat(context: ChatContext): Promise<string>
    generateRecommendations(request: RecommendationRequest): Promise<string[]>

    // Monitoring & Management
    logEvent(event: AIMonitoringEvent): void
    handleError(error: AIError): Promise<void>
    getHealthStatus(): Promise<any>
}

// AI Provider Registry - Quản lý tất cả AI providers
export class AIProviderRegistry {
    private static instance: AIProviderRegistry
    private providers = new Map<string, {
        name: string
        type: string
        service: IAIService
        priority: number
        isActive: boolean
    }>()

    static getInstance(): AIProviderRegistry {
        if (!AIProviderRegistry.instance) {
            AIProviderRegistry.instance = new AIProviderRegistry()
        }
        return AIProviderRegistry.instance
    }

    // Đăng ký AI provider mới
    registerProvider(
        name: string,
        type: string,
        service: IAIService,
        priority: number = 1
    ): void {
        this.providers.set(name, {
            name,
            type,
            service,
            priority,
            isActive: true
        })
        console.log(`[AI-Registry] Registered provider: ${name} (${type})`)
    }

    // Bỏ đăng ký provider
    unregisterProvider(name: string): void {
        this.providers.delete(name)
        console.log(`[AI-Registry] Unregistered provider: ${name}`)
    }

    // Kích hoạt/vô hiệu hóa provider
    setProviderActive(name: string, isActive: boolean): void {
        const provider = this.providers.get(name)
        if (provider) {
            provider.isActive = isActive
            console.log(`[AI-Registry] ${name} ${isActive ? 'activated' : 'deactivated'}`)
        }
    }

    // Lấy provider theo tên
    getProvider(name: string): IAIService | null {
        const provider = this.providers.get(name)
        return provider && provider.isActive ? provider.service : null
    }

    // Lấy tất cả providers đang active
    getActiveProviders(): IAIService[] {
        return Array.from(this.providers.values())
            .filter(p => p.isActive)
            .sort((a, b) => b.priority - a.priority)
            .map(p => p.service)
    }

    // Lấy provider tốt nhất theo type
    getBestProviderByType(type: string): IAIService | null {
        const providers = Array.from(this.providers.values())
            .filter(p => p.type === type && p.isActive)
            .sort((a, b) => b.priority - a.priority)

        return providers.length > 0 ? providers[0].service : null
    }

    // Lấy provider tốt nhất overall
    getBestProvider(): IAIService | null {
        const activeProviders = this.getActiveProviders()
        return activeProviders.length > 0 ? activeProviders[0] : null
    }

    // Lấy thông tin tất cả providers
    getAllProviders(): any[] {
        return Array.from(this.providers.values()).map(p => ({
            name: p.name,
            type: p.type,
            priority: p.priority,
            isActive: p.isActive,
            available: p.service.isAvailable()
        }))
    }

    // Switch provider priority
    setProviderPriority(name: string, priority: number): void {
        const provider = this.providers.get(name)
        if (provider) {
            provider.priority = priority
            console.log(`[AI-Registry] Set ${name} priority to ${priority}`)
        }
    }
}

// Abstract AI Service - Base class cho các AI provider cụ thể
export abstract class BaseAIService implements IAIService {
    protected config: AIConfig
    protected fallbackStrategy: AIFallbackStrategy
    protected requestQueue: AIRequest[] = []
    protected responseCache = new Map<string, AIResponse>()
    protected monitoringEvents: AIMonitoringEvent[] = []

    constructor(config: AIConfig, fallbackStrategy: AIFallbackStrategy) {
        this.config = config
        this.fallbackStrategy = fallbackStrategy
    }

    // Core implementation
    abstract generateResponse(request: AIRequest): Promise<AIResponse>
    abstract isAvailable(): boolean
    abstract getUsageStats(): Promise<AIUsageStats>

    // Default implementations (có thể override)
    async smartSearch(context: SearchContext): Promise<string[]> {
        const request: AIRequest = {
            id: this.generateRequestId(),
            type: 'search',
            provider: this.getProviderName(),
            prompt: this.buildSearchPrompt(context),
            context,
            timestamp: new Date(),
            userId: context.userHistory?.[0] // Assuming first item is user ID
        }

        const response = await this.generateResponse(request)
        return this.parseSearchResults(response.content)
    }

    async generateContent(request: ContentGenerationRequest): Promise<string> {
        const aiRequest: AIRequest = {
            id: this.generateRequestId(),
            type: 'content_generation',
            provider: this.getProviderName(),
            prompt: this.buildContentPrompt(request),
            context: request,
            timestamp: new Date()
        }

        const response = await this.generateResponse(aiRequest)
        return response.content
    }

    async processChat(context: ChatContext): Promise<string> {
        const aiRequest: AIRequest = {
            id: this.generateRequestId(),
            type: 'chat',
            provider: this.getProviderName(),
            prompt: this.buildChatPrompt(context),
            context,
            timestamp: new Date(),
            userId: context.userId
        }

        const response = await this.generateResponse(aiRequest)
        return response.content
    }

    async generateRecommendations(request: RecommendationRequest): Promise<string[]> {
        const aiRequest: AIRequest = {
            id: this.generateRequestId(),
            type: 'recommendation',
            provider: this.getProviderName(),
            prompt: this.buildRecommendationPrompt(request),
            context: request,
            timestamp: new Date(),
            userId: request.userId
        }

        const response = await this.generateResponse(aiRequest)
        return this.parseRecommendations(response.content)
    }

    // Monitoring & Error Handling
    logEvent(event: AIMonitoringEvent): void {
        this.monitoringEvents.push(event)

        // Keep only last 1000 events to prevent memory leak
        if (this.monitoringEvents.length > 1000) {
            this.monitoringEvents = this.monitoringEvents.slice(-1000)
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AI-${event.provider}] ${event.type}: ${event.requestId}`)
        }
    }

    async handleError(error: AIError): Promise<void> {
        this.logEvent({
            type: 'error',
            provider: error.provider,
            requestId: `error-${Date.now()}`,
            timestamp: error.timestamp,
            metadata: { error: error.message, type: error.type }
        })

        // Implement retry logic for retryable errors
        if (error.retryable) {
            await this.sleep(1000) // Wait 1 second before retry
        }
    }

    async getHealthStatus(): Promise<any> {
        const recentEvents = this.monitoringEvents.slice(-100)
        const errors = recentEvents.filter(e => e.type === 'error')
        const responses = recentEvents.filter(e => e.type === 'response')

        return {
            provider: this.getProviderName(),
            available: this.isAvailable(),
            totalRequests: recentEvents.length,
            errorRate: errors.length / Math.max(recentEvents.length, 1),
            averageResponseTime: this.calculateAverageResponseTime(responses),
            cacheSize: this.responseCache.size,
            queueSize: this.requestQueue.length
        }
    }

    // Utility methods
    protected generateRequestId(): string {
        return `${this.getProviderName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    public abstract getProviderName(): string
    public abstract getProviderType(): string

    protected buildSearchPrompt(context: SearchContext): string {
        return `
            Tìm kiếm thông minh cho: "${context.query}"
            ${context.category ? `Danh mục: ${context.category}` : ''}
            ${context.location ? `Vị trí: ${context.location}` : ''}
            ${context.priceRange ? `Khoảng giá: ${context.priceRange.min} - ${context.priceRange.max}` : ''}

            Hãy đưa ra kết quả tìm kiếm phù hợp và gợi ý liên quan.
        `
    }

    protected buildContentPrompt(request: ContentGenerationRequest): string {
        return `
            Tạo nội dung ${request.type} với thông tin sau:
            ${JSON.stringify(request.context, null, 2)}

            Yêu cầu:
            - Ngôn ngữ: ${request.language || 'Tiếng Việt'}
            - Tone: ${request.tone || 'friendly'}
            - Độ dài: ${request.length || 'medium'}

            Hãy tạo nội dung hấp dẫn và phù hợp.
        `
    }

    protected buildChatPrompt(context: ChatContext): string {
        const historyText = context.history.slice(-5).map(msg =>
            `${msg.role}: ${msg.content}`
        ).join('\n')

        return `
            Lịch sử cuộc trò chuyện:
            ${historyText}

            Người dùng: ${context.message}

            Hãy trả lời một cách hữu ích và thân thiện.
        `
    }

    protected buildRecommendationPrompt(request: RecommendationRequest): string {
        return `
            Đưa ra gợi ý cho người dùng ${request.userId}
            Context: ${request.context}
            ${request.currentItem ? `Sản phẩm hiện tại: ${request.currentItem}` : ''}
            Số lượng: ${request.limit || 5}

            Hãy đưa ra gợi ý phù hợp và cá nhân hóa.
        `
    }

    protected parseSearchResults(content: string): string[] {
        // Simple parsing - split by lines and filter out empty results
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 10) // Limit to 10 results
    }

    protected parseRecommendations(content: string): string[] {
        return this.parseSearchResults(content)
    }

    protected calculateAverageResponseTime(responses: AIMonitoringEvent[]): number {
        if (responses.length === 0) return 0

        const totalTime = responses.reduce((sum, response) => {
            return sum + (response.duration || 0)
        }, 0)

        return totalTime / responses.length
    }

    protected sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // Cache management
    protected getCachedResponse(cacheKey: string): AIResponse | null {
        return this.responseCache.get(cacheKey) || null
    }

    protected setCachedResponse(cacheKey: string, response: AIResponse): void {
        // Cache for 5 minutes
        this.responseCache.set(cacheKey, response)
        setTimeout(() => {
            this.responseCache.delete(cacheKey)
        }, 5 * 60 * 1000)
    }

    protected generateCacheKey(request: AIRequest): string {
        return `${request.type}_${request.provider}_${this.hashString(request.prompt)}`
    }

    private hashString(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return hash.toString()
    }
}

// AI Service Factory - Tạo AI service instance
export class AIServiceFactory {
    private static instance: AIServiceFactory
    private services = new Map<string, IAIService>()

    static getInstance(): AIServiceFactory {
        if (!AIServiceFactory.instance) {
            AIServiceFactory.instance = new AIServiceFactory()
        }
        return AIServiceFactory.instance
    }

    registerService(provider: string, service: IAIService): void {
        this.services.set(provider, service)
    }

    getService(provider: string): IAIService | null {
        return this.services.get(provider) || null
    }

    getAllServices(): IAIService[] {
        return Array.from(this.services.values())
    }

    getAvailableServices(): IAIService[] {
        return this.getAllServices().filter(service => service.isAvailable())
    }

    async getBestAvailableService(): Promise<IAIService | null> {
        const availableServices = this.getAvailableServices()

        if (availableServices.length === 0) {
            return null
        }

        // Return the first available service (can be enhanced with load balancing)
        return availableServices[0]
    }
}

// Export singleton instance
export const aiServiceFactory = AIServiceFactory.getInstance()
