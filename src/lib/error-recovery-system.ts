/**
 * Advanced Error Recovery System
 * Hệ thống phục hồi lỗi thông minh với circuit breaker và retry logic
 */

import { logger, logError } from './logger'
import { CONFIG } from './config'

// Error recovery strategies
export enum RecoveryStrategy {
    IMMEDIATE_RETRY = 'immediate_retry',
    EXPONENTIAL_BACKOFF = 'exponential_backoff',
    CIRCUIT_BREAKER = 'circuit_breaker',
    FALLBACK = 'fallback',
    GRACEFUL_DEGRADATION = 'graceful_degradation'
}

// Error severity levels
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Error context
export interface ErrorContext {
    operation: string
    userId?: string
    messageId?: string
    timestamp: number
    retryCount: number
    maxRetries: number
    severity: ErrorSeverity
    strategy: RecoveryStrategy
    metadata: Record<string, any>
}

// Recovery action result
export interface RecoveryResult {
    success: boolean
    action: string
    nextStrategy?: RecoveryStrategy
    retryAfter?: number
    fallbackUsed?: boolean
}

// Error recovery manager
export class ErrorRecoveryManager {
    private static instance: ErrorRecoveryManager
    private errorCounts: Map<string, number> = new Map()
    private lastErrorTimes: Map<string, number> = new Map()
    private circuitBreakerStates: Map<string, boolean> = new Map()
    private recoveryStrategies: Map<string, RecoveryStrategy[]> = new Map()

    private constructor() {
        this.initializeRecoveryStrategies()
    }

    public static getInstance(): ErrorRecoveryManager {
        if (!ErrorRecoveryManager.instance) {
            ErrorRecoveryManager.instance = new ErrorRecoveryManager()
        }
        return ErrorRecoveryManager.instance
    }

    // Initialize recovery strategies for different error types
    private initializeRecoveryStrategies(): void {
        this.recoveryStrategies.set('database_error', [
            RecoveryStrategy.IMMEDIATE_RETRY,
            RecoveryStrategy.EXPONENTIAL_BACKOFF,
            RecoveryStrategy.CIRCUIT_BREAKER,
            RecoveryStrategy.FALLBACK
        ])

        this.recoveryStrategies.set('network_error', [
            RecoveryStrategy.EXPONENTIAL_BACKOFF,
            RecoveryStrategy.CIRCUIT_BREAKER,
            RecoveryStrategy.FALLBACK
        ])

        this.recoveryStrategies.set('api_error', [
            RecoveryStrategy.IMMEDIATE_RETRY,
            RecoveryStrategy.EXPONENTIAL_BACKOFF,
            RecoveryStrategy.GRACEFUL_DEGRADATION
        ])

        this.recoveryStrategies.set('validation_error', [
            RecoveryStrategy.FALLBACK
        ])

        this.recoveryStrategies.set('timeout_error', [
            RecoveryStrategy.EXPONENTIAL_BACKOFF,
            RecoveryStrategy.CIRCUIT_BREAKER,
            RecoveryStrategy.FALLBACK
        ])
    }

    // Main error recovery entry point
    async recoverFromError(
        error: Error,
        context: Partial<ErrorContext>,
        operation: () => Promise<any>
    ): Promise<any> {
        const errorContext: ErrorContext = {
            operation: context.operation || 'unknown',
            userId: context.userId,
            messageId: context.messageId,
            timestamp: Date.now(),
            retryCount: context.retryCount || 0,
            maxRetries: context.maxRetries || CONFIG.BOT.MAX_RETRY_ATTEMPTS,
            severity: this.determineErrorSeverity(error),
            strategy: this.selectRecoveryStrategy(error, context.operation || 'unknown'),
            metadata: context.metadata || {}
        }

        logger.warn('Attempting error recovery', {
            error: error.message,
            context: errorContext
        })

        const result = await this.executeRecoveryStrategy(errorContext, operation)
        
        if (result.success) {
            logger.info('Error recovery successful', {
                operation: errorContext.operation,
                strategy: errorContext.strategy,
                action: result.action
            })
        } else {
            logger.error('Error recovery failed', {
                operation: errorContext.operation,
                strategy: errorContext.strategy,
                action: result.action
            })
        }

        return result
    }

    // Determine error severity based on error type and context
    private determineErrorSeverity(error: Error): ErrorSeverity {
        const errorMessage = error.message.toLowerCase()

        if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
            return ErrorSeverity.CRITICAL
        }

        if (errorMessage.includes('database') || errorMessage.includes('connection')) {
            return ErrorSeverity.HIGH
        }

        if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            return ErrorSeverity.MEDIUM
        }

        if (errorMessage.includes('validation') || errorMessage.includes('input')) {
            return ErrorSeverity.LOW
        }

        return ErrorSeverity.MEDIUM
    }

    // Select appropriate recovery strategy
    private selectRecoveryStrategy(error: Error, operation: string): RecoveryStrategy {
        const errorType = this.classifyError(error)
        const strategies = this.recoveryStrategies.get(errorType) || [RecoveryStrategy.FALLBACK]
        
        // Check if circuit breaker is open
        if (this.isCircuitBreakerOpen(operation)) {
            return RecoveryStrategy.CIRCUIT_BREAKER
        }

        // Return first available strategy
        return strategies[0]
    }

    // Classify error type
    private classifyError(error: Error): string {
        const errorMessage = error.message.toLowerCase()

        if (errorMessage.includes('database') || errorMessage.includes('query')) {
            return 'database_error'
        }

        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            return 'network_error'
        }

        if (errorMessage.includes('api') || errorMessage.includes('http')) {
            return 'api_error'
        }

        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return 'validation_error'
        }

        if (errorMessage.includes('timeout')) {
            return 'timeout_error'
        }

        return 'unknown_error'
    }

    // Execute recovery strategy
    private async executeRecoveryStrategy(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        switch (context.strategy) {
            case RecoveryStrategy.IMMEDIATE_RETRY:
                return this.immediateRetry(context, operation)

            case RecoveryStrategy.EXPONENTIAL_BACKOFF:
                return this.exponentialBackoffRetry(context, operation)

            case RecoveryStrategy.CIRCUIT_BREAKER:
                return this.circuitBreakerRecovery(context, operation)

            case RecoveryStrategy.FALLBACK:
                return this.fallbackRecovery(context, operation)

            case RecoveryStrategy.GRACEFUL_DEGRADATION:
                return this.gracefulDegradation(context, operation)

            default:
                return this.fallbackRecovery(context, operation)
        }
    }

    // Immediate retry strategy
    private async immediateRetry(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        if (context.retryCount >= context.maxRetries) {
            return {
                success: false,
                action: 'max_retries_exceeded',
                nextStrategy: RecoveryStrategy.FALLBACK
            }
        }

        try {
            const result = await operation()
            return {
                success: true,
                action: 'immediate_retry_success'
            }
        } catch (error) {
            return {
                success: false,
                action: 'immediate_retry_failed',
                nextStrategy: RecoveryStrategy.EXPONENTIAL_BACKOFF
            }
        }
    }

    // Exponential backoff retry strategy
    private async exponentialBackoffRetry(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        if (context.retryCount >= context.maxRetries) {
            return {
                success: false,
                action: 'max_retries_exceeded',
                nextStrategy: RecoveryStrategy.CIRCUIT_BREAKER
            }
        }

        const delay = this.calculateBackoffDelay(context.retryCount)
        await this.sleep(delay)

        try {
            const result = await operation()
            return {
                success: true,
                action: 'exponential_backoff_success'
            }
        } catch (error) {
            return {
                success: false,
                action: 'exponential_backoff_failed',
                retryAfter: this.calculateBackoffDelay(context.retryCount + 1),
                nextStrategy: RecoveryStrategy.CIRCUIT_BREAKER
            }
        }
    }

    // Circuit breaker recovery strategy
    private async circuitBreakerRecovery(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        if (this.isCircuitBreakerOpen(context.operation)) {
            return {
                success: false,
                action: 'circuit_breaker_open',
                nextStrategy: RecoveryStrategy.FALLBACK
            }
        }

        try {
            const result = await operation()
            this.resetCircuitBreaker(context.operation)
            return {
                success: true,
                action: 'circuit_breaker_success'
            }
        } catch (error) {
            this.recordError(context.operation)
            return {
                success: false,
                action: 'circuit_breaker_failed',
                nextStrategy: RecoveryStrategy.FALLBACK
            }
        }
    }

    // Fallback recovery strategy
    private async fallbackRecovery(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        try {
            // Implement fallback logic based on operation type
            const fallbackResult = await this.executeFallback(context)
            return {
                success: true,
                action: 'fallback_success',
                fallbackUsed: true
            }
        } catch (error) {
            return {
                success: false,
                action: 'fallback_failed'
            }
        }
    }

    // Graceful degradation strategy
    private async gracefulDegradation(
        context: ErrorContext,
        operation: () => Promise<any>
    ): Promise<RecoveryResult> {
        try {
            // Implement graceful degradation logic
            const degradedResult = await this.executeGracefulDegradation(context)
            return {
                success: true,
                action: 'graceful_degradation_success'
            }
        } catch (error) {
            return {
                success: false,
                action: 'graceful_degradation_failed',
                nextStrategy: RecoveryStrategy.FALLBACK
            }
        }
    }

    // Execute fallback based on operation type
    private async executeFallback(context: ErrorContext): Promise<any> {
        switch (context.operation) {
            case 'sendMessage':
                // Fallback: Use alternative messaging method
                return this.fallbackSendMessage(context)
            
            case 'databaseQuery':
                // Fallback: Use cached data or default values
                return this.fallbackDatabaseQuery(context)
            
            case 'userAuthentication':
                // Fallback: Allow limited access
                return this.fallbackUserAuthentication(context)
            
            default:
                // Generic fallback
                return this.genericFallback(context)
        }
    }

    // Execute graceful degradation
    private async executeGracefulDegradation(context: ErrorContext): Promise<any> {
        // Implement graceful degradation logic
        logger.info('Executing graceful degradation', { operation: context.operation })
        return { degraded: true, operation: context.operation }
    }

    // Fallback implementations
    private async fallbackSendMessage(context: ErrorContext): Promise<any> {
        logger.info('Using fallback send message', { userId: context.userId })
        // Implement fallback messaging logic
        return { fallback: true, type: 'sendMessage' }
    }

    private async fallbackDatabaseQuery(context: ErrorContext): Promise<any> {
        logger.info('Using fallback database query', { operation: context.operation })
        // Implement fallback database logic
        return { fallback: true, type: 'databaseQuery' }
    }

    private async fallbackUserAuthentication(context: ErrorContext): Promise<any> {
        logger.info('Using fallback user authentication', { userId: context.userId })
        // Implement fallback authentication logic
        return { fallback: true, type: 'userAuthentication' }
    }

    private async genericFallback(context: ErrorContext): Promise<any> {
        logger.info('Using generic fallback', { operation: context.operation })
        // Implement generic fallback logic
        return { fallback: true, type: 'generic' }
    }

    // Circuit breaker management
    private isCircuitBreakerOpen(operation: string): boolean {
        return this.circuitBreakerStates.get(operation) || false
    }

    private recordError(operation: string): void {
        const count = this.errorCounts.get(operation) || 0
        this.errorCounts.set(operation, count + 1)
        this.lastErrorTimes.set(operation, Date.now())

        // Open circuit breaker if error threshold exceeded
        if (count >= 5) { // Threshold: 5 errors
            this.circuitBreakerStates.set(operation, true)
            logger.warn('Circuit breaker opened', { operation })
        }
    }

    private resetCircuitBreaker(operation: string): void {
        this.circuitBreakerStates.set(operation, false)
        this.errorCounts.set(operation, 0)
        logger.info('Circuit breaker reset', { operation })
    }

    // Calculate exponential backoff delay
    private calculateBackoffDelay(retryCount: number): number {
        const baseDelay = CONFIG.BOT.RETRY_DELAY
        const maxDelay = 30000 // 30 seconds
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
        return delay + Math.random() * 1000 // Add jitter
    }

    // Sleep utility
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // Get recovery statistics
    getRecoveryStats() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            circuitBreakerStates: Object.fromEntries(this.circuitBreakerStates),
            lastErrorTimes: Object.fromEntries(this.lastErrorTimes)
        }
    }

    // Reset all statistics
    resetStats(): void {
        this.errorCounts.clear()
        this.lastErrorTimes.clear()
        this.circuitBreakerStates.clear()
        logger.info('Error recovery statistics reset')
    }
}

// Export singleton instance
export const errorRecoveryManager = ErrorRecoveryManager.getInstance()
