/**
 * Centralized Error Handling System
 * Hệ thống xử lý lỗi tập trung với phân loại và xử lý thông minh
 */

import { CONFIG, ErrorMessages } from './config'
import { logger, logError } from './logger'

// Error types
export enum ErrorType {
    // System errors
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',

    // User errors
    USER_ERROR = 'USER_ERROR',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    USER_BLOCKED = 'USER_BLOCKED',
    USER_EXPIRED = 'USER_EXPIRED',

    // Bot errors
    BOT_ERROR = 'BOT_ERROR',
    BOT_STOPPED = 'BOT_STOPPED',
    BOT_MAINTENANCE = 'BOT_MAINTENANCE',
    BOT_OVERLOADED = 'BOT_OVERLOADED',

    // Spam errors
    SPAM_ERROR = 'SPAM_ERROR',
    SPAM_DETECTED = 'SPAM_DETECTED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    DUPLICATE_MESSAGE = 'DUPLICATE_MESSAGE',

    // API errors
    API_ERROR = 'API_ERROR',
    WEBHOOK_ERROR = 'WEBHOOK_ERROR',
    FACEBOOK_API_ERROR = 'FACEBOOK_API_ERROR',

    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // Business logic errors
    BUSINESS_ERROR = 'BUSINESS_ERROR',
    OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}

// Error severity levels
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

// Custom error class
export class BotError extends Error {
    public readonly type: ErrorType
    public readonly severity: ErrorSeverity
    public readonly code: string
    public readonly context?: Record<string, any>
    public readonly isOperational: boolean
    public readonly timestamp: string
    public readonly userId?: string
    public readonly sessionId?: string

    constructor(
        message: string,
        type: ErrorType,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        code?: string,
        context?: Record<string, any>,
        isOperational: boolean = true,
        userId?: string,
        sessionId?: string
    ) {
        super(message)
        this.name = 'BotError'
        this.type = type
        this.severity = severity
        this.code = code || type
        this.context = context
        this.isOperational = isOperational
        this.timestamp = new Date().toISOString()
        this.userId = userId
        this.sessionId = sessionId

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BotError)
        }
    }

    public toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            severity: this.severity,
            code: this.code,
            context: this.context,
            isOperational: this.isOperational,
            timestamp: this.timestamp,
            userId: this.userId,
            sessionId: this.sessionId,
            stack: this.stack
        }
    }
}

// Error handler class
export class ErrorHandler {
    private static instance: ErrorHandler
    private errorCounts: Map<string, number> = new Map()
    private lastErrorTime: Map<string, number> = new Map()

    private constructor() { }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler()
        }
        return ErrorHandler.instance
    }

    // Handle different types of errors
    public handleError(error: Error | BotError, context?: Record<string, any>): BotError {
        let botError: BotError

        if (error instanceof BotError) {
            botError = error
        } else {
            // Convert generic Error to BotError
            botError = new BotError(
                error.message,
                this.classifyError(error),
                this.determineSeverity(error),
                undefined,
                context
            )
        }

        // Log the error
        this.logError(botError)

        // Track error frequency
        this.trackError(botError)

        // Handle critical errors
        if (botError.severity === ErrorSeverity.CRITICAL) {
            this.handleCriticalError(botError)
        }

        return botError
    }

    // Classify generic errors
    private classifyError(error: Error): ErrorType {
        const message = error.message.toLowerCase()
        const name = error.name.toLowerCase()

        // Database errors
        if (name.includes('database') || name.includes('sql') || message.includes('connection')) {
            return ErrorType.DATABASE_ERROR
        }

        // Network errors
        if (name.includes('network') || name.includes('fetch') || message.includes('timeout')) {
            return ErrorType.NETWORK_ERROR
        }

        // Timeout errors
        if (message.includes('timeout') || name.includes('timeout')) {
            return ErrorType.TIMEOUT_ERROR
        }

        // Validation errors
        if (name.includes('validation') || message.includes('invalid')) {
            return ErrorType.VALIDATION_ERROR
        }

        // Default to system error
        return ErrorType.SYSTEM_ERROR
    }

    // Determine error severity
    private determineSeverity(error: Error): ErrorSeverity {
        const message = error.message.toLowerCase()
        const name = error.name.toLowerCase()

        // Critical errors
        if (name.includes('critical') || message.includes('fatal') || message.includes('crash')) {
            return ErrorSeverity.CRITICAL
        }

        // High severity errors
        if (name.includes('database') || name.includes('network') || message.includes('connection')) {
            return ErrorSeverity.HIGH
        }

        // Medium severity errors
        if (name.includes('validation') || message.includes('invalid') || message.includes('timeout')) {
            return ErrorSeverity.MEDIUM
        }

        // Default to low severity
        return ErrorSeverity.LOW
    }

    // Log error with appropriate level
    private logError(error: BotError): void {
        const context = {
            type: error.type,
            severity: error.severity,
            code: error.code,
            userId: error.userId,
            sessionId: error.sessionId,
            isOperational: error.isOperational,
            ...error.context
        }

        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                logger.error(`Critical error: ${error.message}`, context, error)
                break
            case ErrorSeverity.HIGH:
                logger.error(`High severity error: ${error.message}`, context, error)
                break
            case ErrorSeverity.MEDIUM:
                logger.warn(`Medium severity error: ${error.message}`, context)
                break
            case ErrorSeverity.LOW:
                logger.info(`Low severity error: ${error.message}`, context)
                break
        }
    }

    // Track error frequency
    private trackError(error: BotError): void {
        const key = `${error.type}:${error.code}`
        const count = this.errorCounts.get(key) || 0
        this.errorCounts.set(key, count + 1)
        this.lastErrorTime.set(key, Date.now())
    }

    // Handle critical errors
    private handleCriticalError(error: BotError): void {
        // Log critical error
        logger.error(`Critical error occurred`, {
            error: error.toJSON(),
            action: 'CRITICAL_ERROR_HANDLED'
        })

        // In production, you might want to:
        // - Send alerts to monitoring systems
        // - Notify administrators
        // - Trigger automatic recovery procedures
        // - Save error to persistent storage
    }

    // Get user-friendly error message
    public getUserFriendlyMessage(error: BotError): string {
        // Check if we have a specific message for this error type
        const errorKey = error.type as keyof typeof ErrorMessages
        if (ErrorMessages[errorKey]) {
            return ErrorMessages[errorKey]
        }

        // Return generic error message based on severity
        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                return CONFIG.ERRORS.INTERNAL_ERROR
            case ErrorSeverity.HIGH:
                return CONFIG.ERRORS.INTERNAL_ERROR
            case ErrorSeverity.MEDIUM:
                return CONFIG.ERRORS.VALIDATION_ERROR
            case ErrorSeverity.LOW:
                return CONFIG.ERRORS.INTERNAL_ERROR
            default:
                return CONFIG.ERRORS.INTERNAL_ERROR
        }
    }

    // Check if error should be retried
    public shouldRetry(error: BotError): boolean {
        // Don't retry operational errors
        if (error.isOperational) return false

        // Don't retry critical errors
        if (error.severity === ErrorSeverity.CRITICAL) return false

        // Retry network and timeout errors
        if (error.type === ErrorType.NETWORK_ERROR || error.type === ErrorType.TIMEOUT_ERROR) {
            return true
        }

        // Don't retry user errors
        if (error.type.startsWith('USER_') || error.type.startsWith('SPAM_')) {
            return false
        }

        return false
    }

    // Get retry delay
    public getRetryDelay(error: BotError, attempt: number): number {
        const baseDelay = CONFIG.BOT.RETRY_DELAY
        return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Max 30 seconds
    }

    // Get error statistics
    public getErrorStats(): Record<string, any> {
        const stats: Record<string, any> = {}

        for (const [key, count] of this.errorCounts.entries()) {
            const lastTime = this.lastErrorTime.get(key)
            stats[key] = {
                count,
                lastOccurrence: lastTime ? new Date(lastTime).toISOString() : null
            }
        }

        return stats
    }

    // Clear error statistics
    public clearErrorStats(): void {
        this.errorCounts.clear()
        this.lastErrorTime.clear()
    }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Export convenience functions
export const handleError = (error: Error | BotError, context?: Record<string, any>) =>
    errorHandler.handleError(error, context)

export const getUserFriendlyMessage = (error: BotError) =>
    errorHandler.getUserFriendlyMessage(error)

export const shouldRetry = (error: BotError) =>
    errorHandler.shouldRetry(error)

export const getRetryDelay = (error: BotError, attempt: number) =>
    errorHandler.getRetryDelay(error, attempt)

// Error factory functions
export const createBotError = (
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    context?: Record<string, any>,
    userId?: string,
    sessionId?: string
) => new BotError(message, type, severity, code, context, true, userId, sessionId)

export const createSystemError = (message: string, context?: Record<string, any>) =>
    createBotError(message, ErrorType.SYSTEM_ERROR, ErrorSeverity.HIGH, undefined, context)

export const createDatabaseError = (message: string, context?: Record<string, any>) =>
    createBotError(message, ErrorType.DATABASE_ERROR, ErrorSeverity.HIGH, undefined, context)

export const createNetworkError = (message: string, context?: Record<string, any>) =>
    createBotError(message, ErrorType.NETWORK_ERROR, ErrorSeverity.MEDIUM, undefined, context)

export const createTimeoutError = (message: string, context?: Record<string, any>) =>
    createBotError(message, ErrorType.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, undefined, context)

export const createUserError = (message: string, type: ErrorType, context?: Record<string, any>, userId?: string) =>
    createBotError(message, type, ErrorSeverity.LOW, undefined, context, true, userId)

export const createValidationError = (message: string, context?: Record<string, any>) =>
    createBotError(message, ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW, undefined, context)

export const createSpamError = (message: string, type: ErrorType, context?: Record<string, any>, userId?: string) =>
    createBotError(message, type, ErrorSeverity.LOW, undefined, context, true, userId)

export const createApiError = (message: string, type: ErrorType, context?: Record<string, any>) =>
    createBotError(message, type, ErrorSeverity.MEDIUM, undefined, context)

export default errorHandler