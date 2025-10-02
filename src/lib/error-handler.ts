// Enhanced Error Handling & Retry Logic for Bot Tân Dậu - Hỗ Trợ Chéo

export interface RetryOptions {
    maxRetries: number
    delay: number
    backoffMultiplier: number
    retryCondition?: (error: any) => boolean
}

export interface ErrorContext {
    userId?: string
    action: string
    timestamp: string
    error: any
    retryCount?: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
        // Retry on network errors, timeouts, rate limits
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'EAI_AGAIN',
            'rate limit',
            'timeout',
            'network',
            'temporary failure'
        ]

        const errorMessage = error?.message?.toLowerCase() || ''
        const errorCode = error?.code?.toLowerCase() || ''

        return retryableErrors.some(retryable =>
            errorMessage.includes(retryable) || errorCode.includes(retryable)
        )
    }
}

// Enhanced retry function with exponential backoff
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context?: Partial<ErrorContext>
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
    let lastError: any

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            const result = await fn()

            // Log successful retry if it wasn't the first attempt
            if (attempt > 0) {
                console.log(`✅ Retry successful on attempt ${attempt + 1}`, {
                    action: context?.action,
                    userId: context?.userId,
                    attempt: attempt + 1
                })
            }

            return result

        } catch (error) {
            lastError = error

            // Log error context
            const errorContext: ErrorContext = {
                userId: context?.userId,
                action: context?.action || 'unknown',
                timestamp: new Date().toISOString(),
                error,
                retryCount: attempt
            }

            console.error(`❌ Attempt ${attempt + 1} failed:`, errorContext)

            // Don't retry if it's the last attempt or error is not retryable
            if (attempt === opts.maxRetries || !opts.retryCondition!(error)) {
                break
            }

            // Calculate delay with exponential backoff
            const delay = opts.delay * Math.pow(opts.backoffMultiplier, attempt)

            console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 2}/${opts.maxRetries + 1})`)

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    // All retries failed, throw the last error
    throw lastError
}

// Enhanced error reporting for admin
export async function reportErrorToAdmin(error: any, context: ErrorContext) {
    try {
        // Get admin users
        const { supabaseAdmin } = await import('./supabase')
        const { data: admins } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('is_active', true)

        if (!admins || admins.length === 0) {
            console.error('No active admins to report error to')
            return
        }

        const errorMsg = (error as any)?.message || 'Unknown error'
        const errorStack = (error as any)?.stack || 'No stack trace'

        const errorMessage = `🚨 SYSTEM ERROR REPORT

📊 ERROR DETAILS:
• Action: ${context.action}
• User ID: ${context.userId || 'N/A'}
• Timestamp: ${context.timestamp}
• Retry Count: ${context.retryCount || 0}

❌ ERROR MESSAGE:
${errorMsg}

🔍 ERROR STACK:
${errorStack}

💡 SUGGESTED ACTIONS:
• Check system logs
• Verify database connectivity
• Check Facebook API status
• Review user permissions`

        // Send error report to all admins
        const { sendMessage } = await import('./facebook-api')

        for (const admin of admins) {
            try {
                await sendMessage(admin.facebook_id, errorMessage)
                console.log(`✅ Error report sent to admin: ${admin.facebook_id}`)
            } catch (sendError) {
                console.error(`Failed to send error report to admin ${admin.facebook_id}:`, sendError)
            }
        }

    } catch (reportError) {
        console.error('Failed to report error to admins:', reportError)
    }
}

// Enhanced error handler for bot operations
export async function handleBotError(error: any, context: ErrorContext) {
    console.error(`🚨 Bot Error in ${context.action}:`, {
        error: error?.message,
        stack: error?.stack,
        userId: context.userId,
        timestamp: context.timestamp
    })

    // Report critical errors to admins
    if (isCriticalError(error)) {
        await reportErrorToAdmin(error, context)
    }

    // Return user-friendly error message
    return getUserFriendlyErrorMessage(error, context.action)
}

// Check if error is critical and needs admin attention
function isCriticalError(error: any): boolean {
    const criticalErrors = [
        'database connection',
        'authentication failed',
        'permission denied',
        'rate limit exceeded',
        'system overload',
        'out of memory',
        'disk space',
        'critical'
    ]

    const errorMessage = error?.message?.toLowerCase() || ''
    return criticalErrors.some(critical => errorMessage.includes(critical))
}

// Get user-friendly error message
function getUserFriendlyErrorMessage(error: any, action: string): string {
    const errorMessage = error?.message?.toLowerCase() || ''

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('connection')) {
        return '🗄️ Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút!'
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('econnreset')) {
        return '🌐 Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại!'
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return '⏱️ Quá nhiều yêu cầu. Vui lòng đợi một chút và thử lại!'
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return '🔒 Bạn không có quyền thực hiện hành động này!'
    }

    // File/Image errors
    if (errorMessage.includes('file') || errorMessage.includes('image') || errorMessage.includes('upload')) {
        return '📷 Lỗi xử lý hình ảnh. Vui lòng thử lại với hình ảnh khác!'
    }

    // Generic fallback
    return `❌ Có lỗi xảy ra khi ${action}. Vui lòng thử lại sau!`
}

// Enhanced error boundary for async operations
export async function safeExecute<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await withRetry(operation, DEFAULT_RETRY_OPTIONS, context)
    } catch (error) {
        await handleBotError(error, context)

        // Return fallback value if provided
        if (fallback !== undefined) {
            console.log(`🔄 Using fallback value for ${context.action}`)
            return fallback
        }

        // Re-throw error if no fallback
        throw error
    }
}

// Database operation wrapper with error handling
export async function safeDbOperation<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    fallback?: T
): Promise<T | null | undefined> {
    return safeExecute(async () => {
        const { data, error } = await operation()

        if (error) {
            throw error
        }

        return data as T
    }, context, fallback)
}

// Facebook API wrapper with error handling
export async function safeFacebookApi<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: T
): Promise<T | undefined> {
    return safeExecute(operation, context, fallback)
}

// Validation helper with detailed error messages
export function validateInput(input: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = []

    for (const rule of rules) {
        const result = rule.validator(input)
        if (!result.valid) {
            errors.push(rule.message)
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

export interface ValidationRule {
    validator: (input: any) => { valid: boolean; message?: string }
    message: string
}

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

// Predefined validation rules
export const ValidationRules = {
    required: (message = 'Trường này là bắt buộc'): ValidationRule => ({
        validator: (input) => ({
            valid: input !== null && input !== undefined && input !== '',
            message
        }),
        message
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
        validator: (input) => ({
            valid: String(input).length >= min,
            message: message || `Phải có ít nhất ${min} ký tự`
        }),
        message: message || `Phải có ít nhất ${min} ký tự`
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
        validator: (input) => ({
            valid: String(input).length <= max,
            message: message || `Không được vượt quá ${max} ký tự`
        }),
        message: message || `Không được vượt quá ${max} ký tự`
    }),

    phoneNumber: (message = 'Số điện thoại không hợp lệ'): ValidationRule => ({
        validator: (input) => ({
            valid: /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/.test(String(input).replace(/\D/g, '')),
            message
        }),
        message
    }),

    email: (message = 'Email không hợp lệ'): ValidationRule => ({
        validator: (input) => ({
            valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input)),
            message
        }),
        message
    }),

    numeric: (message = 'Phải là số hợp lệ'): ValidationRule => ({
        validator: (input) => ({
            valid: !isNaN(Number(input)) && Number(input) > 0,
            message
        }),
        message
    }),

    url: (message = 'URL không hợp lệ'): ValidationRule => ({
        validator: (input) => {
            try {
                new URL(String(input))
                return { valid: true }
            } catch {
                return { valid: false, message }
            }
        },
        message
    })
}

// Enhanced logging with context
export function logWithContext(level: 'info' | 'warn' | 'error', message: string, context?: any) {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''

    const logMessage = `[${timestamp}] ${message}${contextStr}`

    switch (level) {
        case 'info':
            console.log(`ℹ️ ${logMessage}`)
            break
        case 'warn':
            console.warn(`⚠️ ${logMessage}`)
            break
        case 'error':
            console.error(`❌ ${logMessage}`)
            break
    }
}

// Performance monitoring
export async function measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: ErrorContext
): Promise<T> {
    const startTime = Date.now()

    try {
        const result = await operation()
        const duration = Date.now() - startTime

        logWithContext('info', `Performance: ${operationName} completed in ${duration}ms`, {
            ...context,
            duration,
            success: true
        })

        return result
    } catch (error) {
        const duration = Date.now() - startTime

        logWithContext('error', `Performance: ${operationName} failed after ${duration}ms`, {
            ...context,
            duration,
            success: false,
            error: (error as any)?.message
        })

        throw error
    }
}

// Graceful shutdown handler
export async function gracefulShutdown(signal: string) {
    console.log(`🛑 Received ${signal}. Starting graceful shutdown...`)

    try {
        // Close database connections
        console.log('🔌 Closing database connections...')

        // Cancel pending operations
        console.log('⏹️ Canceling pending operations...')

        // Send shutdown notification to admins
        const { supabaseAdmin } = await import('./supabase')
        const { data: admins } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('is_active', true)

        if (admins && admins.length > 0) {
            const { sendMessage } = await import('./facebook-api')

            const shutdownMessage = `🛑 SYSTEM SHUTDOWN
⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}
📊 Lý do: ${signal}
🔄 Hệ thống sẽ khởi động lại sớm`

            for (const admin of admins) {
                try {
                    await sendMessage(admin.facebook_id, shutdownMessage)
                } catch (error) {
                    console.error(`Failed to send shutdown notification to ${admin.facebook_id}`)
                }
            }
        }

        console.log('✅ Graceful shutdown completed')
        process.exit(0)

    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error)
        process.exit(1)
    }
}

// Setup signal handlers for graceful shutdown
export function setupGracefulShutdown() {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error)
        gracefulShutdown('uncaughtException')
    })
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
        gracefulShutdown('unhandledRejection')
    })
}
