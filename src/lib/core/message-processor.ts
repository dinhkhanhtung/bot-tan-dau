/**
 * Advanced Message Processor
 * Xử lý tin nhắn với pipeline tối ưu và circuit breaker
 */

import { logger, logPerformance, logError } from '../logger'
import { errorHandler, createUserError, ErrorType } from '../error-handler'
import { CONFIG } from '../config'

// Message processing pipeline stages
export enum ProcessingStage {
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    CONTEXT_ANALYSIS = 'context_analysis',
    BUSINESS_LOGIC = 'business_logic',
    RESPONSE_GENERATION = 'response_generation',
    DELIVERY = 'delivery'
}

// Circuit breaker states
export enum CircuitState {
    CLOSED = 'closed',
    OPEN = 'open',
    HALF_OPEN = 'half_open'
}

// Message processing context
export interface MessageContext {
    userId: string
    messageId: string
    text: string
    isPostback: boolean
    postback?: string
    timestamp: number
    stage: ProcessingStage
    metadata: Record<string, any>
    retryCount: number
    maxRetries: number
}

// Circuit breaker for external services
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED
    private failureCount = 0
    private lastFailureTime = 0
    private readonly threshold: number
    private readonly timeout: number

    constructor(threshold = 5, timeout = 60000) {
        this.threshold = threshold
        this.timeout = timeout
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = CircuitState.HALF_OPEN
            } else {
                throw new Error('Circuit breaker is OPEN')
            }
        }

        try {
            const result = await operation()
            this.onSuccess()
            return result
        } catch (error) {
            this.onFailure()
            throw error
        }
    }

    private onSuccess() {
        this.failureCount = 0
        this.state = CircuitState.CLOSED
    }

    private onFailure() {
        this.failureCount++
        this.lastFailureTime = Date.now()
        
        if (this.failureCount >= this.threshold) {
            this.state = CircuitState.OPEN
        }
    }

    getState(): CircuitState {
        return this.state
    }
}

// Message processor with advanced features
export class MessageProcessor {
    private static instance: MessageProcessor
    private circuitBreakers: Map<string, CircuitBreaker> = new Map()
    private processingQueue: Map<string, Promise<any>> = new Map()
    private readonly maxConcurrentProcessing = 10
    private currentProcessingCount = 0

    private constructor() {}

    public static getInstance(): MessageProcessor {
        if (!MessageProcessor.instance) {
            MessageProcessor.instance = new MessageProcessor()
        }
        return MessageProcessor.instance
    }

    // Get or create circuit breaker for service
    private getCircuitBreaker(serviceName: string): CircuitBreaker {
        if (!this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.set(serviceName, new CircuitBreaker())
        }
        return this.circuitBreakers.get(serviceName)!
    }

    // Process message with advanced pipeline
    async processMessage(
        user: any,
        text: string,
        isPostback?: boolean,
        postback?: string
    ): Promise<void> {
        const startTime = Date.now()
        const messageId = `${user.facebook_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const context: MessageContext = {
            userId: user.facebook_id,
            messageId,
            text,
            isPostback: isPostback || false,
            postback,
            timestamp: Date.now(),
            stage: ProcessingStage.VALIDATION,
            metadata: {},
            retryCount: 0,
            maxRetries: CONFIG.BOT.MAX_RETRY_ATTEMPTS
        }

        // Check if already processing this user
        if (this.processingQueue.has(context.userId)) {
            logger.warn('User already being processed', { userId: context.userId })
            return
        }

        // Rate limiting check
        if (this.currentProcessingCount >= this.maxConcurrentProcessing) {
            logger.warn('Processing queue full', { 
                currentCount: this.currentProcessingCount,
                maxCount: this.maxConcurrentProcessing 
            })
            throw new Error('Processing queue is full')
        }

        this.currentProcessingCount++
        const processingPromise = this.executeProcessingPipeline(context, user)
        this.processingQueue.set(context.userId, processingPromise)

        try {
            await processingPromise
        } finally {
            this.processingQueue.delete(context.userId)
            this.currentProcessingCount--
        }

        const duration = Date.now() - startTime
        logPerformance('Message processing completed', duration, { messageId, userId: context.userId })
    }

    // Execute processing pipeline with error handling
    private async executeProcessingPipeline(context: MessageContext, user: any): Promise<void> {
        const stages = [
            { stage: ProcessingStage.VALIDATION, handler: this.validateMessage.bind(this) },
            { stage: ProcessingStage.AUTHENTICATION, handler: this.authenticateUser.bind(this) },
            { stage: ProcessingStage.CONTEXT_ANALYSIS, handler: this.analyzeContext.bind(this) },
            { stage: ProcessingStage.BUSINESS_LOGIC, handler: this.executeBusinessLogic.bind(this) },
            { stage: ProcessingStage.RESPONSE_GENERATION, handler: this.generateResponse.bind(this) },
            { stage: ProcessingStage.DELIVERY, handler: this.deliverResponse.bind(this) }
        ]

        for (const { stage, handler } of stages) {
            context.stage = stage
            
            try {
                await this.executeWithRetry(context, user, handler)
                logger.debug(`Stage completed: ${stage}`, { messageId: context.messageId })
            } catch (error) {
                logger.error(`Stage failed: ${stage}`, { 
                    messageId: context.messageId, 
                    error: error instanceof Error ? error.message : String(error) 
                })
                
                if (this.isRetryableError(error)) {
                    await this.handleRetry(context, user, error)
                } else {
                    await this.handleFinalError(context, user, error)
                    break
                }
            }
        }
    }

    // Execute stage with retry logic
    private async executeWithRetry(
        context: MessageContext, 
        user: any, 
        handler: (context: MessageContext, user: any) => Promise<void>
    ): Promise<void> {
        let lastError: Error | null = null
        
        for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
            try {
                context.retryCount = attempt
                await handler(context, user)
                return
            } catch (error) {
                lastError = error as Error
                
                if (attempt < context.maxRetries && this.isRetryableError(error)) {
                    const delay = this.calculateRetryDelay(attempt)
                    logger.warn(`Retry attempt ${attempt + 1}/${context.maxRetries}`, {
                        messageId: context.messageId,
                        stage: context.stage,
                        delay,
                        error: lastError.message
                    })
                    await this.sleep(delay)
                } else {
                    throw lastError
                }
            }
        }
        
        throw lastError
    }

    // Validation stage
    private async validateMessage(context: MessageContext, user: any): Promise<void> {
        if (!context.text && !context.isPostback) {
            throw new Error('Empty message')
        }

        if (context.text && context.text.length > CONFIG.BOT.MAX_MESSAGE_LENGTH) {
            throw new Error('Message too long')
        }

        // Additional validation logic here
        context.metadata.validated = true
    }

    // Authentication stage
    private async authenticateUser(context: MessageContext, user: any): Promise<void> {
        if (!user.facebook_id) {
            throw new Error('Invalid user')
        }

        // Use circuit breaker for database operations
        const circuitBreaker = this.getCircuitBreaker('database')
        await circuitBreaker.execute(async () => {
            // Authentication logic here
            context.metadata.authenticated = true
        })
    }

    // Context analysis stage
    private async analyzeContext(context: MessageContext, user: any): Promise<void> {
        // Context analysis logic here
        context.metadata.contextAnalyzed = true
    }

    // Business logic stage
    private async executeBusinessLogic(context: MessageContext, user: any): Promise<void> {
        // Business logic execution here
        context.metadata.businessLogicExecuted = true
    }

    // Response generation stage
    private async generateResponse(context: MessageContext, user: any): Promise<void> {
        // Response generation logic here
        context.metadata.responseGenerated = true
    }

    // Delivery stage
    private async deliverResponse(context: MessageContext, user: any): Promise<void> {
        // Response delivery logic here
        context.metadata.responseDelivered = true
    }

    // Check if error is retryable
    private isRetryableError(error: any): boolean {
        if (error instanceof Error) {
            const retryableErrors = [
                'ECONNRESET',
                'ETIMEDOUT',
                'ENOTFOUND',
                'ECONNREFUSED',
                'Database connection failed',
                'Network error'
            ]
            
            return retryableErrors.some(pattern => error.message.includes(pattern))
        }
        return false
    }

    // Calculate retry delay with exponential backoff
    private calculateRetryDelay(attempt: number): number {
        const baseDelay = CONFIG.BOT.RETRY_DELAY
        const maxDelay = 30000 // 30 seconds
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        return delay + Math.random() * 1000 // Add jitter
    }

    // Handle retry
    private async handleRetry(context: MessageContext, user: any, error: Error): Promise<void> {
        logger.warn('Handling retry', {
            messageId: context.messageId,
            stage: context.stage,
            retryCount: context.retryCount,
            error: error.message
        })
    }

    // Handle final error
    private async handleFinalError(context: MessageContext, user: any, error: Error): Promise<void> {
        logger.error('Final error in processing pipeline', {
            messageId: context.messageId,
            stage: context.stage,
            error: error.message
        })

        // Send error message to user
        try {
            const { sendMessage } = await import('../facebook-api')
            await sendMessage(context.userId, CONFIG.ERRORS.INTERNAL_ERROR)
        } catch (sendError) {
            logger.error('Failed to send error message', { 
                userId: context.userId, 
                error: sendError instanceof Error ? sendError.message : String(sendError) 
            })
        }
    }

    // Sleep utility
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // Get processing statistics
    getStats() {
        return {
            currentProcessingCount: this.currentProcessingCount,
            maxConcurrentProcessing: this.maxConcurrentProcessing,
            queueSize: this.processingQueue.size,
            circuitBreakerStates: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
                service: name,
                state: cb.getState()
            }))
        }
    }
}

// Export singleton instance
export const messageProcessor = MessageProcessor.getInstance()
