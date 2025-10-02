// AI Configuration for Vercel Deployment
export const AI_CONFIG = {
    // OpenAI Configuration
    OPENAI: {
        ENABLED: process.env.OPENAI_ENABLED === 'true',
        API_KEY: process.env.OPENAI_API_KEY,
        MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
        TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    },

    // Google AI Configuration
    GOOGLE_AI: {
        ENABLED: process.env.GOOGLE_AI_ENABLED === 'true',
        API_KEY: process.env.GOOGLE_AI_API_KEY,
        MODEL: process.env.GOOGLE_AI_MODEL || 'gemini-pro',
        MAX_TOKENS: parseInt(process.env.GOOGLE_AI_MAX_TOKENS || '1000'),
        TEMPERATURE: parseFloat(process.env.GOOGLE_AI_TEMPERATURE || '0.7')
    },

    // Anthropic Claude Configuration
    CLAUDE: {
        ENABLED: process.env.CLAUDE_ENABLED === 'true',
        API_KEY: process.env.CLAUDE_API_KEY,
        MODEL: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        MAX_TOKENS: parseInt(process.env.CLAUDE_MAX_TOKENS || '1000'),
        TEMPERATURE: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')
    },

    // AI Features Toggle
    FEATURES: {
        SMART_SEARCH: process.env.AI_SMART_SEARCH === 'true',
        CONTENT_GENERATION: process.env.AI_CONTENT_GENERATION === 'true',
        CHAT_ASSISTANT: process.env.AI_CHAT_ASSISTANT === 'true',
        RECOMMENDATIONS: process.env.AI_RECOMMENDATIONS === 'true',
        AUTO_REPLY: process.env.AI_AUTO_REPLY === 'true'
    },

    // AI Limits
    LIMITS: {
        DAILY_REQUESTS: parseInt(process.env.AI_DAILY_LIMIT || '100'),
        REQUEST_TIMEOUT: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000'),
        MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || '3')
    }
} as const

// AI Provider Selection
export function getActiveAIProvider() {
    if (AI_CONFIG.OPENAI.ENABLED && AI_CONFIG.OPENAI.API_KEY) {
        return 'openai'
    }
    if (AI_CONFIG.GOOGLE_AI.ENABLED && AI_CONFIG.GOOGLE_AI.API_KEY) {
        return 'google'
    }
    if (AI_CONFIG.CLAUDE.ENABLED && AI_CONFIG.CLAUDE.API_KEY) {
        return 'claude'
    }
    return null
}

// Check if AI is enabled
export function isAIEnabled(): boolean {
    const activeProvider = getActiveAIProvider()
    return activeProvider !== null && AI_CONFIG.FEATURES.CHAT_ASSISTANT
}

// Get AI configuration for active provider
export function getAIConfig() {
    const provider = getActiveAIProvider()
    if (!provider) return null

    switch (provider) {
        case 'openai':
            return AI_CONFIG.OPENAI
        case 'google':
            return AI_CONFIG.GOOGLE_AI
        case 'claude':
            return AI_CONFIG.CLAUDE
        default:
            return null
    }
}
