/**
 * Centralized Caching System
 * Hệ thống caching tập trung với TTL và invalidation
 */

import { CONFIG, CacheKeys } from './config'
import { logger, logDebug } from './logger'

// Cache entry interface
interface CacheEntry<T = any> {
    value: T
    expiresAt: number
    createdAt: number
    accessCount: number
    lastAccessed: number
}

// Cache statistics
interface CacheStats {
    hits: number
    misses: number
    sets: number
    deletes: number
    size: number
    maxSize: number
}

// Cache class
export class Cache {
    private static instance: Cache
    private cache: Map<string, CacheEntry> = new Map()
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        maxSize: CONFIG.DATABASE.CACHE_MAX_SIZE
    }
    private cleanupInterval: NodeJS.Timeout | null = null

    private constructor() {
        this.startCleanupInterval()
    }

    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache()
        }
        return Cache.instance
    }

    // Start cleanup interval
    private startCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 60000) // Cleanup every minute
    }

    // Set cache entry
    public set<T>(key: string, value: T, ttl: number = CONFIG.DATABASE.CACHE_TTL): void {
        const now = Date.now()
        const expiresAt = now + ttl

        this.cache.set(key, {
            value,
            expiresAt,
            createdAt: now,
            accessCount: 0,
            lastAccessed: now
        })

        this.stats.sets++
        this.stats.size = this.cache.size

        logDebug(`Cache set: ${key}`, { ttl, size: this.stats.size })
    }

    // Get cache entry
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key)

        if (!entry) {
            this.stats.misses++
            return null
        }

        const now = Date.now()

        // Check if expired
        if (now > entry.expiresAt) {
            this.cache.delete(key)
            this.stats.misses++
            this.stats.size = this.cache.size
            return null
        }

        // Update access info
        entry.accessCount++
        entry.lastAccessed = now

        this.stats.hits++
        return entry.value as T
    }

    // Check if key exists
    public has(key: string): boolean {
        const entry = this.cache.get(key)

        if (!entry) {
            return false
        }

        const now = Date.now()

        // Check if expired
        if (now > entry.expiresAt) {
            this.cache.delete(key)
            this.stats.size = this.cache.size
            return false
        }

        return true
    }

    // Delete cache entry
    public delete(key: string): boolean {
        const deleted = this.cache.delete(key)
        if (deleted) {
            this.stats.deletes++
            this.stats.size = this.cache.size
        }
        return deleted
    }

    // Clear all cache
    public clear(): void {
        this.cache.clear()
        this.stats.size = 0
        logDebug('Cache cleared')
    }

    // Get cache statistics
    public getStats(): CacheStats {
        return { ...this.stats }
    }

    // Get cache size
    public getSize(): number {
        return this.cache.size
    }

    // Check if cache is full
    public isFull(): boolean {
        return this.cache.size >= this.stats.maxSize
    }

    // Cleanup expired entries
    private cleanup(): void {
        const now = Date.now()
        let cleanedCount = 0

        for (const [key, entry] of Array.from(this.cache.entries())) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
                cleanedCount++
            }
        }

        this.stats.size = this.cache.size

        if (cleanedCount > 0) {
            logDebug(`Cache cleanup: removed ${cleanedCount} expired entries`)
        }
    }

    // Evict least recently used entries
    private evictLRU(): void {
        const entries = Array.from(this.cache.entries())
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

        const toEvict = Math.floor(this.stats.maxSize * 0.1) // Evict 10%
        for (let i = 0; i < toEvict && i < entries.length; i++) {
            this.cache.delete(entries[i][0])
        }

        this.stats.size = this.cache.size
        logDebug(`Cache evicted ${toEvict} LRU entries`)
    }

    // Destroy cache instance
    public destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        this.clear()
    }
}

// Export singleton instance
export const cache = Cache.getInstance()

// Cache utility functions
export const CacheUtils = {
    // Generate cache key
    generateKey: (type: keyof typeof CacheKeys, ...params: string[]): string => {
        const keyTemplate = CacheKeys[type] as any
        return typeof keyTemplate === 'function' ? keyTemplate(...params) : keyTemplate
    },

    // Set with auto-generated key
    set: <T>(type: keyof typeof CacheKeys, value: T, ttl?: number, ...params: string[]): void => {
        const key = CacheUtils.generateKey(type, ...params)
        cache.set(key, value, ttl)
    },

    // Get with auto-generated key
    get: <T>(type: keyof typeof CacheKeys, ...params: string[]): T | null => {
        const key = CacheUtils.generateKey(type, ...params)
        return cache.get<T>(key)
    },

    // Delete with auto-generated key
    delete: (type: keyof typeof CacheKeys, ...params: string[]): boolean => {
        const key = CacheUtils.generateKey(type, ...params)
        return cache.delete(key)
    },

    // Check if exists with auto-generated key
    has: (type: keyof typeof CacheKeys, ...params: string[]): boolean => {
        const key = CacheUtils.generateKey(type, ...params)
        return cache.has(key)
    }
}

// Database query cache wrapper
export class DatabaseCache {
    private static instance: DatabaseCache
    private cache: Cache

    private constructor() {
        this.cache = Cache.getInstance()
    }

    public static getInstance(): DatabaseCache {
        if (!DatabaseCache.instance) {
            DatabaseCache.instance = new DatabaseCache()
        }
        return DatabaseCache.instance
    }

    // Cache database query result
    public async cacheQuery<T>(
        key: string,
        queryFn: () => Promise<T>,
        ttl: number = CONFIG.DATABASE.CACHE_TTL
    ): Promise<T> {
        // Check cache first
        const cached = this.cache.get<T>(key)
        if (cached !== null) {
            logDebug(`Database cache hit: ${key}`)
            return cached
        }

        // Execute query
        const startTime = Date.now()
        try {
            const result = await queryFn()
            const duration = Date.now() - startTime

            // Cache result
            this.cache.set(key, result, ttl)

            logDebug(`Database query cached: ${key}`, { duration })
            return result
        } catch (error) {
            const duration = Date.now() - startTime
            logger.error(`Database query failed: ${key}`, { duration }, error as Error)
            throw error
        }
    }

    // Invalidate cache by pattern
    public invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern)
        let invalidatedCount = 0

        for (const key of Array.from(this.cache['cache'].keys())) {
            if (regex.test(key)) {
                this.cache.delete(key)
                invalidatedCount++
            }
        }

        if (invalidatedCount > 0) {
            logDebug(`Cache invalidated by pattern: ${pattern}`, { count: invalidatedCount })
        }
    }

    // Invalidate user-related cache
    public invalidateUser(userId: string): void {
        this.invalidatePattern(`user:${userId}`)
        this.invalidatePattern(`session:${userId}`)
        this.invalidatePattern(`spam:${userId}`)
    }

    // Invalidate bot-related cache
    public invalidateBot(): void {
        this.invalidatePattern('bot:')
        this.invalidatePattern('system:')
    }
}

// Export singleton instance
export const dbCache = DatabaseCache.getInstance()

// Convenience functions
export const cacheQuery = <T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
): Promise<T> => dbCache.cacheQuery(key, queryFn, ttl)

export const invalidateUserCache = (userId: string): void =>
    dbCache.invalidateUser(userId)

export const invalidateBotCache = (): void =>
    dbCache.invalidateBot()

export const invalidatePattern = (pattern: string): void =>
    dbCache.invalidatePattern(pattern)

export default cache