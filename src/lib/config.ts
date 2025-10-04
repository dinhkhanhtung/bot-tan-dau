/**
 * Centralized Configuration Management
 * Tập trung tất cả cấu hình và biến môi trường
 */

// Environment variables validation
const requiredEnvVars = [
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'FACEBOOK_VERIFY_TOKEN',
    'FACEBOOK_PAGE_ACCESS_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
] as const

// Validate required environment variables (only at runtime, not build time)
function validateEnvironment(): void {
    // Skip validation during build process
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') {
        return
    }
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
        console.warn(`Missing environment variables: ${missingVars.join(', ')}`)
        // Don't throw error during build, just warn
    }
}

// Initialize environment validation (only in development)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    validateEnvironment()
}

// Bot Configuration
export const BOT_CONFIG = {
    // Basic settings
    APP_ID: process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
    APP_SECRET: process.env.FACEBOOK_APP_SECRET || 'YOUR_FACEBOOK_APP_SECRET',
    VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN || 'YOUR_VERIFY_TOKEN',
    PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN',

    // Database settings
    SUPABASE_URL: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY',

    // Bot behavior
    MAX_MESSAGE_LENGTH: 2000,
    MAX_ATTACHMENT_SIZE: 25 * 1024 * 1024, // 25MB
    MESSAGE_TIMEOUT: 30000, // 30 seconds
    WEBHOOK_TIMEOUT: 10000, // 10 seconds

    // Rate limiting
    RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
    MAX_MESSAGES_PER_WINDOW: 20,
    MAX_MESSAGES_PER_HOUR: 100,

    // Spam protection
    SPAM_COOLDOWN_MINUTES: 15,
    MAX_IDENTICAL_MESSAGES: 2,
    WARNING_THRESHOLD: 1,

    // Session management
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    MAX_SESSION_SIZE: 1000,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_DEBUG: process.env.NODE_ENV === 'development',

    // Error handling
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second

    // Admin settings
    ADMIN_FACEBOOK_IDS: (process.env.ADMIN_FACEBOOK_IDS || '').split(',').filter(Boolean),

    // Feature flags
    FEATURES: {
        ENABLE_AI: process.env.ENABLE_AI === 'true',
        ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
        ENABLE_CACHING: process.env.ENABLE_CACHING === 'true',
        ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true'
    }
} as const

// Database Configuration
export const DATABASE_CONFIG = {
    // Connection settings
    CONNECTION_POOL_SIZE: 10,
    CONNECTION_TIMEOUT: 30000,
    QUERY_TIMEOUT: 10000,

    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,

    // Cache settings
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    CACHE_MAX_SIZE: 1000,

    // Tables
    TABLES: {
        USERS: 'users',
        MESSAGES: 'user_messages',
        SPAM_TRACKING: 'spam_tracking',
        SPAM_LOGS: 'spam_logs',
        BOT_SETTINGS: 'bot_settings',
        SESSIONS: 'bot_sessions',
        LISTINGS: 'listings',
        RATINGS: 'ratings',
        PAYMENTS: 'payments',
        NOTIFICATIONS: 'notifications'
    }
} as const

// API Configuration
export const API_CONFIG = {
    // Facebook API
    FACEBOOK_API_URL: 'https://graph.facebook.com/v18.0',
    FACEBOOK_WEBHOOK_URL: process.env.WEBHOOK_URL || '/api/webhook',

    // Request settings
    REQUEST_TIMEOUT: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,

    // Rate limiting
    RATE_LIMIT_PER_MINUTE: 200,
    RATE_LIMIT_PER_HOUR: 1000
} as const

// Logging Configuration
export const LOGGING_CONFIG = {
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    },

    // Log formats
    FORMATS: {
        JSON: 'json',
        SIMPLE: 'simple',
        COMBINED: 'combined'
    },

    // Default settings
    DEFAULT_LEVEL: BOT_CONFIG.LOG_LEVEL,
    DEFAULT_FORMAT: 'json',

    // File settings
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    LOG_DIR: 'logs'
} as const

// Error Messages
export const ERROR_MESSAGES = {
    // General errors
    INTERNAL_ERROR: '❌ Có lỗi xảy ra. Vui lòng thử lại sau!',
    NETWORK_ERROR: '❌ Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại!',
    TIMEOUT_ERROR: '⏰ Hết thời gian chờ. Vui lòng thử lại!',
    VALIDATION_ERROR: '❌ Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!',

    // User errors
    USER_NOT_FOUND: '❌ Không tìm thấy người dùng!',
    USER_BLOCKED: '🚫 Tài khoản đã bị khóa!',
    USER_EXPIRED: '⏰ Tài khoản đã hết hạn!',

    // Bot errors
    BOT_STOPPED: '🚫 Bot đã tạm dừng!',
    BOT_MAINTENANCE: '🔧 Bot đang bảo trì!',
    BOT_OVERLOADED: '⚠️ Bot đang quá tải!',

    // Spam errors
    SPAM_DETECTED: '🚫 Phát hiện spam!',
    RATE_LIMIT_EXCEEDED: '⚠️ Gửi tin nhắn quá nhanh!',
    DUPLICATE_MESSAGE: '⚠️ Tin nhắn trùng lặp!',

    // Database errors
    DATABASE_ERROR: '❌ Lỗi cơ sở dữ liệu!',
    CONNECTION_ERROR: '❌ Lỗi kết nối cơ sở dữ liệu!',

    // API errors
    API_ERROR: '❌ Lỗi API!',
    WEBHOOK_ERROR: '❌ Lỗi webhook!',
    FACEBOOK_API_ERROR: '❌ Lỗi Facebook API!'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
    // General success
    OPERATION_SUCCESS: '✅ Thao tác thành công!',
    MESSAGE_SENT: '✅ Tin nhắn đã được gửi!',
    DATA_SAVED: '✅ Dữ liệu đã được lưu!',

    // User success
    USER_CREATED: '✅ Tài khoản đã được tạo!',
    USER_UPDATED: '✅ Thông tin đã được cập nhật!',
    USER_ACTIVATED: '✅ Tài khoản đã được kích hoạt!',

    // Bot success
    BOT_STARTED: '✅ Bot đã khởi động!',
    BOT_RESTARTED: '✅ Bot đã khởi động lại!',
    SESSION_CREATED: '✅ Phiên làm việc đã được tạo!',

    // Registration success
    REGISTRATION_SUCCESS: '✅ Đăng ký thành công!',
    VERIFICATION_SUCCESS: '✅ Xác thực thành công!',
    PAYMENT_SUCCESS: '✅ Thanh toán thành công!'
} as const

// Validation Rules
export const VALIDATION_RULES = {
    // User validation
    USER: {
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 50,
        PHONE_PATTERN: /^[0-9]{10,11}$/,
        EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        FACEBOOK_ID_PATTERN: /^[0-9]+$/
    },

    // Message validation
    MESSAGE: {
        TEXT_MAX_LENGTH: 2000,
        ATTACHMENT_MAX_SIZE: 25 * 1024 * 1024, // 25MB
        ATTACHMENT_ALLOWED_TYPES: ['image', 'file', 'video', 'audio']
    },

    // Listing validation
    LISTING: {
        TITLE_MIN_LENGTH: 10,
        TITLE_MAX_LENGTH: 200,
        DESCRIPTION_MIN_LENGTH: 20,
        DESCRIPTION_MAX_LENGTH: 2000,
        PRICE_MIN: 0,
        PRICE_MAX: 10000000000 // 10 billion
    }
} as const

// Cache Keys
export const CACHE_KEYS = {
    // User cache
    USER: (facebookId: string) => `user:${facebookId}`,
    USER_SESSION: (facebookId: string) => `session:${facebookId}`,
    USER_SPAM: (facebookId: string) => `spam:${facebookId}`,

    // Bot cache
    BOT_SETTINGS: 'bot:settings',
    BOT_STATUS: 'bot:status',

    // System cache
    SYSTEM_STATS: 'system:stats',
    SYSTEM_HEALTH: 'system:health'
} as const

// Event Types
export const EVENT_TYPES = {
    // Message events
    MESSAGE_RECEIVED: 'message:received',
    MESSAGE_SENT: 'message:sent',
    MESSAGE_FAILED: 'message:failed',

    // User events
    USER_CREATED: 'user:created',
    USER_UPDATED: 'user:updated',
    USER_BLOCKED: 'user:blocked',
    USER_UNBLOCKED: 'user:unblocked',

    // Bot events
    BOT_STARTED: 'bot:started',
    BOT_STOPPED: 'bot:stopped',
    BOT_ERROR: 'bot:error',

    // System events
    SYSTEM_STARTUP: 'system:startup',
    SYSTEM_SHUTDOWN: 'system:shutdown',
    SYSTEM_ERROR: 'system:error'
} as const

// Export configuration object
export const CONFIG = {
    BOT: BOT_CONFIG,
    DATABASE: DATABASE_CONFIG,
    API: API_CONFIG,
    LOGGING: LOGGING_CONFIG,
    ERRORS: ERROR_MESSAGES,
    SUCCESS: SUCCESS_MESSAGES,
    VALIDATION: VALIDATION_RULES,
    CACHE: CACHE_KEYS,
    EVENTS: EVENT_TYPES,
    // Add SUPABASE config for compatibility
    SUPABASE: {
        URL: BOT_CONFIG.SUPABASE_URL,
        ANON_KEY: BOT_CONFIG.SUPABASE_ANON_KEY,
        SERVICE_ROLE_KEY: BOT_CONFIG.SUPABASE_SERVICE_ROLE_KEY
    }
} as const

// Type definitions
export type BotConfig = typeof BOT_CONFIG
export type DatabaseConfig = typeof DATABASE_CONFIG
export type ApiConfig = typeof API_CONFIG
export type LoggingConfig = typeof LOGGING_CONFIG
export type ErrorMessages = typeof ERROR_MESSAGES
export type SuccessMessages = typeof SUCCESS_MESSAGES
export type ValidationRules = typeof VALIDATION_RULES
export type CacheKeys = typeof CACHE_KEYS
export type EventTypes = typeof EVENT_TYPES
export type Config = typeof CONFIG

// Export individual configs for easier access
export { ERROR_MESSAGES as ErrorMessages }
export { CACHE_KEYS as CacheKeys }

// Utility functions
export const ConfigUtils = {
    // Check if feature is enabled
    isFeatureEnabled: (feature: keyof typeof BOT_CONFIG.FEATURES): boolean => {
        return BOT_CONFIG.FEATURES[feature]
    },

    // Get error message
    getErrorMessage: (key: keyof typeof ERROR_MESSAGES): string => {
        return ERROR_MESSAGES[key]
    },

    // Get success message
    getSuccessMessage: (key: keyof typeof SUCCESS_MESSAGES): string => {
        return SUCCESS_MESSAGES[key]
    },

    // Validate environment
    validateEnvironment,

    // Get cache key
    getCacheKey: (type: keyof typeof CACHE_KEYS, ...params: string[]): string => {
        const keyTemplate = CACHE_KEYS[type] as any
        return typeof keyTemplate === 'function' ? keyTemplate(...params) : keyTemplate
    }
} as const

export default CONFIG
