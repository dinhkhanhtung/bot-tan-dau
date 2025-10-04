/**
 * Advanced Database Service
 * Service database tối ưu hóa với connection pooling, query optimization và intelligent caching
 */

import { dbPool } from './database-connection-pool'
import { logger, logPerformance } from './logger'
import { monitoringSystem, recordTimer, recordCounter } from './monitoring-system'
import { errorRecoveryManager, RecoveryStrategy } from './error-recovery-system'
import { CONFIG } from './config'

// Query optimization strategies
export enum QueryStrategy {
    CACHE_FIRST = 'cache_first',
    DATABASE_FIRST = 'database_first',
    PARALLEL = 'parallel',
    BATCH = 'batch'
}

// Query context
export interface QueryContext {
    operation: string
    userId?: string
    strategy: QueryStrategy
    cacheKey?: string
    ttl?: number
    retryCount: number
    maxRetries: number
}

// Advanced database service
export class AdvancedDatabaseService {
    private static instance: AdvancedDatabaseService
    private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
    private queryStats: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map()
    private batchQueue: Map<string, Array<{ query: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }>> = new Map()

    private constructor() {
        this.startBatchProcessor()
    }

    public static getInstance(): AdvancedDatabaseService {
        if (!AdvancedDatabaseService.instance) {
            AdvancedDatabaseService.instance = new AdvancedDatabaseService()
        }
        return AdvancedDatabaseService.instance
    }

    // Execute query with advanced optimization
    async executeQuery<T>(
        operation: string,
        queryFn: (client: any) => Promise<T>,
        context: Partial<QueryContext> = {}
    ): Promise<T> {
        const queryContext: QueryContext = {
            operation,
            strategy: context.strategy || QueryStrategy.CACHE_FIRST,
            cacheKey: context.cacheKey,
            ttl: context.ttl || 300000, // 5 minutes default
            retryCount: context.retryCount || 0,
            maxRetries: context.maxRetries || 3,
            userId: context.userId
        }

        return this.executeWithStrategy(queryContext, queryFn)
    }

    // Execute query with selected strategy
    private async executeWithStrategy<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        switch (context.strategy) {
            case QueryStrategy.CACHE_FIRST:
                return this.executeCacheFirst(context, queryFn)

            case QueryStrategy.DATABASE_FIRST:
                return this.executeDatabaseFirst(context, queryFn)

            case QueryStrategy.PARALLEL:
                return this.executeParallel(context, queryFn)

            case QueryStrategy.BATCH:
                return this.executeBatch(context, queryFn)

            default:
                return this.executeCacheFirst(context, queryFn)
        }
    }

    // Cache-first strategy
    private async executeCacheFirst<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        // Try cache first
        if (context.cacheKey) {
            const cached = this.getFromCache<T>(context.cacheKey)
            if (cached !== null) {
                recordCounter('database_cache_hit', 1, { operation: context.operation })
                return cached
            }
        }

        // Execute database query
        const result = await this.executeDatabaseQuery(context, queryFn)

        // Cache the result
        if (context.cacheKey && result) {
            this.setCache(context.cacheKey, result, context.ttl!)
        }

        recordCounter('database_cache_miss', 1, { operation: context.operation })
        return result
    }

    // Database-first strategy
    private async executeDatabaseFirst<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        // Execute database query
        const result = await this.executeDatabaseQuery(context, queryFn)

        // Update cache
        if (context.cacheKey && result) {
            this.setCache(context.cacheKey, result, context.ttl!)
        }

        return result
    }

    // Parallel strategy (cache and database simultaneously)
    private async executeParallel<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        const promises: Promise<T>[] = []

        // Add cache promise if cache key exists
        if (context.cacheKey) {
            const cacheKey = context.cacheKey
            promises.push(
                Promise.resolve(this.getFromCache<T>(cacheKey)).then(cached => {
                    if (cached !== null) {
                        recordCounter('database_cache_hit', 1, { operation: context.operation })
                        return cached
                    }
                    throw new Error('Cache miss')
                })
            )
        }

        // Add database promise
        promises.push(this.executeDatabaseQuery(context, queryFn))

        try {
            // Wait for first successful result
            const result = await this.promiseAny(promises)

            // Cache the result if it came from database
            if (context.cacheKey && result) {
                this.setCache(context.cacheKey, result, context.ttl!)
            }

            return result
        } catch (error) {
            // If all promises failed, throw the error
            throw error
        }
    }

    // Batch strategy
    private async executeBatch<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.batchQueue.has(context.operation)) {
                this.batchQueue.set(context.operation, [])
            }

            this.batchQueue.get(context.operation)!.push({
                query: () => this.executeDatabaseQuery(context, queryFn),
                resolve,
                reject
            })
        })
    }

    // Execute database query with connection pooling
    private async executeDatabaseQuery<T>(
        context: QueryContext,
        queryFn: (client: any) => Promise<T>
    ): Promise<T> {
        return monitoringSystem.timeFunction(
            `database_query_${context.operation}`,
            async () => {
                return errorRecoveryManager.recoverFromError(
                    new Error('Database query'),
                    {
                        operation: context.operation,
                        userId: context.userId,
                        retryCount: context.retryCount,
                        maxRetries: context.maxRetries,
                        metadata: { strategy: context.strategy }
                    },
                    async () => {
                        return dbPool.executeQuery(context.operation, queryFn)
                    }
                )
            },
            { operation: context.operation, strategy: context.strategy }
        )
    }

    // Cache management
    private getFromCache<T>(key: string): T | null {
        const cached = this.queryCache.get(key)
        if (!cached) return null

        const now = Date.now()
        if (now - cached.timestamp > cached.ttl) {
            this.queryCache.delete(key)
            return null
        }

        return cached.data
    }

    private setCache<T>(key: string, data: T, ttl: number): void {
        this.queryCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        })

        // Clean up old cache entries
        this.cleanupCache()
    }

    private cleanupCache(): void {
        const now = Date.now()
        const toDelete: string[] = []

        for (const [key, cached] of Array.from(this.queryCache)) {
            if (now - cached.timestamp > cached.ttl) {
                toDelete.push(key)
            }
        }

        for (const key of toDelete) {
            this.queryCache.delete(key)
        }
    }

    // Batch processor
    private startBatchProcessor(): void {
        setInterval(() => {
            this.processBatchQueue()
        }, 100) // Process every 100ms
    }

    private async processBatchQueue(): Promise<void> {
        for (const [operation, queries] of Array.from(this.batchQueue)) {
            if (queries.length === 0) continue

            try {
                // Execute all queries in parallel
                const results = await Promise.all(queries.map(q => q.query()))

                // Resolve all promises
                queries.forEach((q, index) => {
                    q.resolve(results[index])
                })

                // Clear the batch
                this.batchQueue.set(operation, [])

                recordCounter('database_batch_processed', queries.length, { operation })
            } catch (error) {
                // Reject all promises
                queries.forEach(q => {
                    q.reject(error)
                })

                // Clear the batch
                this.batchQueue.set(operation, [])

                logger.error('Batch processing failed', { operation, error: error instanceof Error ? error.message : String(error) })
            }
        }
    }

    // User operations with optimization
    async getUserByFacebookId(facebookId: string): Promise<any> {
        return this.executeQuery(
            'getUserByFacebookId',
            async (client) => {
                const { data, error } = await client
                    .from('users')
                    .select('*')
                    .eq('facebook_id', facebookId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw new Error(`Database error: ${error.message}`)
                }

                return data
            },
            {
                strategy: QueryStrategy.CACHE_FIRST,
                cacheKey: `user:${facebookId}`,
                ttl: 300000, // 5 minutes
                userId: facebookId
            }
        )
    }

    async createUser(userData: any): Promise<any> {
        return this.executeQuery(
            'createUser',
            async (client) => {
                const { data, error } = await client
                    .from('users')
                    .insert(userData)
                    .select()
                    .single()

                if (error) {
                    throw new Error(`Database error: ${error.message}`)
                }

                return data
            },
            {
                strategy: QueryStrategy.DATABASE_FIRST,
                userId: userData.facebook_id
            }
        )
    }

    async updateUser(facebookId: string, updates: any): Promise<any> {
        return this.executeQuery(
            'updateUser',
            async (client) => {
                const { data, error } = await client
                    .from('users')
                    .update(updates)
                    .eq('facebook_id', facebookId)
                    .select()
                    .single()

                if (error) {
                    throw new Error(`Database error: ${error.message}`)
                }

                return data
            },
            {
                strategy: QueryStrategy.DATABASE_FIRST,
                userId: facebookId
            }
        )
    }

    async getBotStatus(): Promise<string> {
        return this.executeQuery(
            'getBotStatus',
            async (client) => {
                try {
                    const { data, error } = await client
                        .from('bot_settings')
                        .select('value')
                        .eq('key', 'bot_status')
                        .single()

                    if (error) {
                        // If table doesn't exist or other error, return default status
                        if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
                            logger.warn('Bot settings table not found, using default status', { error: error.message })
                            return 'running'
                        }
                        throw new Error(`Database error: ${error.message}`)
                    }

                    return data?.value || 'running'
                } catch (error) {
                    // Fallback to default status if any error occurs
                    logger.warn('Failed to get bot status, using default', { error: error instanceof Error ? error.message : String(error) })
                    return 'running'
                }
            },
            {
                strategy: QueryStrategy.CACHE_FIRST,
                cacheKey: 'bot_status',
                ttl: 60000 // 1 minute
            }
        )
    }

    async getBotSession(facebookId: string): Promise<any> {
        return this.executeQuery(
            'getBotSession',
            async (client) => {
                const { data, error } = await client
                    .from('bot_sessions')
                    .select('*')
                    .eq('user_id', facebookId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw new Error(`Database error: ${error.message}`)
                }

                return data
            },
            {
                strategy: QueryStrategy.CACHE_FIRST,
                cacheKey: `session:${facebookId}`,
                ttl: 60000, // 1 minute
                userId: facebookId
            }
        )
    }

    async updateBotSession(facebookId: string, sessionData: any): Promise<void> {
        await this.executeQuery(
            'updateBotSession',
            async (client) => {
                const { error } = await client
                    .from('bot_sessions')
                    .upsert(
                        {
                            user_id: facebookId,
                            session_data: sessionData,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: 'user_id' }
                    )

                if (error) {
                    throw new Error(`Database error: ${error.message}`)
                }
            },
            {
                strategy: QueryStrategy.DATABASE_FIRST,
                userId: facebookId
            }
        )

        // Invalidate cache
        this.invalidateCache(`session:${facebookId}`)
    }

    // Batch operations
    async batchUpdate(updates: Array<{ table: string; data: any; where: any }>): Promise<any[]> {
        const results: any[] = []

        for (const update of updates) {
            try {
                const result = await this.executeQuery(
                    `batchUpdate_${update.table}`,
                    async (client) => {
                        const { data, error } = await client
                            .from(update.table)
                            .update(update.data)
                            .match(update.where)
                            .select()

                        if (error) {
                            throw new Error(`Database error: ${error.message}`)
                        }

                        return data
                    },
                    {
                        strategy: QueryStrategy.BATCH
                    }
                )

                results.push(result)
            } catch (error) {
                logger.error('Batch update failed', {
                    table: update.table,
                    error: error instanceof Error ? error.message : String(error)
                })
                results.push(null)
            }
        }

        return results
    }

    // Cache invalidation
    invalidateCache(pattern: string): void {
        const regex = new RegExp(pattern)
        const toDelete: string[] = []

        for (const key of Array.from(this.queryCache.keys())) {
            if (regex.test(key)) {
                toDelete.push(key)
            }
        }

        for (const key of toDelete) {
            this.queryCache.delete(key)
        }

        logger.debug('Cache invalidated', { pattern, invalidatedCount: toDelete.length })
    }

    // Get service statistics
    getStats() {
        const cacheStats = {
            size: this.queryCache.size,
            hitRate: this.calculateCacheHitRate()
        }

        const queryStats = Object.fromEntries(this.queryStats)

        return {
            cache: cacheStats,
            queries: queryStats,
            batchQueue: Object.fromEntries(
                Array.from(this.batchQueue.entries()).map(([key, value]) => [key, value.length])
            )
        }
    }

    private calculateCacheHitRate(): number {
        const hits = monitoringSystem.getMetricsSummary()['database_cache_hit']?.count || 0
        const misses = monitoringSystem.getMetricsSummary()['database_cache_miss']?.count || 0
        const total = hits + misses
        return total > 0 ? hits / total : 0
    }

    // Clear all caches
    clearAllCaches(): void {
        this.queryCache.clear()
        logger.info('All caches cleared')
    }

    // Promise.any polyfill for older TypeScript targets
    private async promiseAny<T>(promises: Promise<T>[]): Promise<T> {
        return new Promise((resolve, reject) => {
            let rejectedCount = 0
            const errors: Error[] = []

            for (const promise of promises) {
                promise
                    .then(resolve)
                    .catch(error => {
                        errors.push(error)
                        rejectedCount++
                        if (rejectedCount === promises.length) {
                            reject(new Error('All promises rejected'))
                        }
                    })
            }
        })
    }
}

// Export singleton instance
export const advancedDbService = AdvancedDatabaseService.getInstance()
