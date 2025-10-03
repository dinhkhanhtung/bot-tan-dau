// AI Types - Định nghĩa các interface và types cho hệ thống AI

export interface AIProvider {
    name: string
    enabled: boolean
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
}

export interface AIConfig {
    providers: {
        openai: AIProvider
        google: AIProvider
        claude: AIProvider
    }
    features: {
        smartSearch: boolean
        contentGeneration: boolean
        chatAssistant: boolean
        recommendations: boolean
        autoReply: boolean
    }
    limits: {
        dailyRequests: number
        requestTimeout: number
        maxRetries: number
    }
}

export interface AIRequest {
    id: string
    type: AIRequestType
    provider: string
    prompt: string
    context?: any
    timestamp: Date
    userId?: string
}

export interface AIResponse {
    id: string
    requestId: string
    provider: string
    content: string
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    timestamp: Date
    success: boolean
    error?: string
}

export interface AIFallbackStrategy {
    primary: string
    secondary: string[]
    timeout: number
    maxRetries: number
}

export interface SearchContext {
    query: string
    category?: string
    location?: string
    priceRange?: {
        min: number
        max: number
    }
    userHistory?: string[]
    similarSearches?: string[]
}

export interface ContentGenerationRequest {
    type: ContentType
    context: {
        title?: string
        category?: string
        price?: number
        location?: string
        features?: string[]
        targetAudience?: string
    }
    language?: string
    tone?: 'formal' | 'casual' | 'friendly' | 'professional'
    length?: 'short' | 'medium' | 'long'
}

export interface ChatContext {
    userId: string
    conversationId: string
    message: string
    history: ChatMessage[]
    userProfile?: UserProfile
    intent?: string
    entities?: any[]
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: any
}

export interface UserProfile {
    id: string
    preferences: {
        categories: string[]
        priceRange: {
            min: number
            max: number
        }
        locations: string[]
    }
    behavior: {
        searchHistory: string[]
        purchaseHistory: string[]
        chatPatterns: string[]
    }
}

export interface RecommendationRequest {
    userId: string
    context: 'search' | 'browse' | 'purchase' | 'chat'
    currentItem?: string
    limit?: number
}

export interface AIUsageStats {
    provider: string
    totalRequests: number
    successRate: number
    averageResponseTime: number
    dailyUsage: {
        date: string
        requests: number
        tokens: number
    }[]
    errorRate: number
    cost: number
}

export type AIRequestType =
    | 'chat'
    | 'search'
    | 'content_generation'
    | 'recommendation'
    | 'classification'
    | 'summarization'
    | 'translation'

export type ContentType =
    | 'product_description'
    | 'listing_title'
    | 'seo_content'
    | 'social_media_post'
    | 'email_template'
    | 'review_response'

export type AIErrorType =
    | 'provider_unavailable'
    | 'rate_limit_exceeded'
    | 'invalid_request'
    | 'authentication_failed'
    | 'timeout'
    | 'network_error'
    | 'content_policy_violation'

export interface AIError {
    type: AIErrorType
    message: string
    provider: string
    retryable: boolean
    timestamp: Date
}

export interface AIMonitoringEvent {
    type: 'request' | 'response' | 'error' | 'fallback'
    provider: string
    requestId: string
    timestamp: Date
    duration?: number
    metadata?: any
}
