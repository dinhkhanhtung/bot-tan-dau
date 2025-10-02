// Performance Optimization - Caching System for Bot Tân Dậu - Hỗ Trợ Chéo

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number // Time to live in milliseconds
}

interface CacheOptions {
    ttl?: number // Default: 5 minutes
    maxSize?: number // Default: 100 entries
}

export class Cache<T = any> {
    private cache = new Map<string, CacheEntry<T>>()
    private options: Required<CacheOptions>

    constructor(options: CacheOptions = {}) {
        this.options = {
            ttl: options.ttl || 5 * 60 * 1000, // 5 minutes
            maxSize: options.maxSize || 100
        }
    }

    // Set cache entry
    set(key: string, data: T, customTtl?: number): void {
        // Clean expired entries first
        this.cleanExpired()

        // Remove oldest entry if cache is full
        if (this.cache.size >= this.options.maxSize) {
            const firstKey = Array.from(this.cache.keys())[0]
            if (firstKey) {
                this.cache.delete(firstKey)
            }
        }

        const ttl = customTtl || this.options.ttl
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        })
    }

    // Get cache entry
    get(key: string): T | null {
        const entry = this.cache.get(key)

        if (!entry) {
            return null
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key)
            return null
        }

        return entry.data
    }

    // Check if key exists and is valid
    has(key: string): boolean {
        const entry = this.cache.get(key)

        if (!entry) {
            return false
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    // Delete specific entry
    delete(key: string): boolean {
        return this.cache.delete(key)
    }

    // Clear all entries
    clear(): void {
        this.cache.clear()
    }

    // Get cache size
    size(): number {
        this.cleanExpired()
        return this.cache.size
    }

    // Clean expired entries
    cleanExpired(): void {
        const now = Date.now()
        const entries = Array.from(this.cache.entries())
        for (const [key, entry] of entries) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key)
            }
        }
    }

    // Get cache stats
    getStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.size(),
            maxSize: this.options.maxSize,
            hitRate: 0 // Would need to track hits/misses for this
        }
    }
}

// Global cache instances
export const userCache = new Cache({ ttl: 10 * 60 * 1000 }) // 10 minutes
export const listingCache = new Cache({ ttl: 5 * 60 * 1000 }) // 5 minutes
export const searchCache = new Cache({ ttl: 15 * 60 * 1000 }) // 15 minutes
export const adminCache = new Cache({ ttl: 2 * 60 * 1000 }) // 2 minutes

// Cache keys generators
export const CacheKeys = {
    user: (facebookId: string) => `user:${facebookId}`,
    userListings: (facebookId: string) => `user_listings:${facebookId}`,
    listing: (listingId: string) => `listing:${listingId}`,
    searchResults: (query: string, category?: string) => `search:${category || 'all'}:${query}`,
    adminStats: (type: string) => `admin_stats:${type}`,
    popularListings: () => 'popular_listings',
    recentListings: (category?: string) => `recent_listings:${category || 'all'}`,
    userStats: (facebookId: string) => `user_stats:${facebookId}`
}

// Cached database operations
export async function getCachedUser(facebookId: string): Promise<any | null> {
    const cacheKey = CacheKeys.user(facebookId)
    const cached = userCache.get(cacheKey)

    if (cached) {
        console.log(`✅ Cache hit for user: ${facebookId}`)
        return cached
    }

    try {
        const { supabaseAdmin } = await import('./supabase')
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', facebookId)
            .single()

        if (error || !data) {
            return null
        }

        // Cache the result
        userCache.set(cacheKey, data)
        console.log(`💾 Cached user: ${facebookId}`)

        return data
    } catch (error) {
        console.error('Error fetching user:', error)
        return null
    }
}

// Cached listing operations
export async function getCachedListings(category?: string, limit: number = 20): Promise<any[]> {
    const cacheKey = CacheKeys.recentListings(category)
    const cached = listingCache.get(cacheKey)

    if (cached) {
        console.log(`✅ Cache hit for listings: ${category || 'all'}`)
        return cached
    }

    try {
        const { supabaseAdmin } = await import('./supabase')
        let query = supabaseAdmin
            .from('listings')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error || !data) {
            return []
        }

        // Cache the result
        listingCache.set(cacheKey, data)
        console.log(`💾 Cached listings: ${category || 'all'}`)

        return data
    } catch (error) {
        console.error('Error fetching listings:', error)
        return []
    }
}

// Cached search with smart invalidation
export async function getCachedSearchResults(query: string, category?: string): Promise<any[]> {
    const cacheKey = CacheKeys.searchResults(query, category)
    const cached = searchCache.get(cacheKey)

    if (cached) {
        console.log(`✅ Cache hit for search: ${query}`)
        return cached
    }

    try {
        const { supabaseAdmin } = await import('./supabase')
        let searchQuery = supabaseAdmin
            .from('listings')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20)

        // Simple search implementation
        if (query) {
            searchQuery = searchQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        }

        if (category) {
            searchQuery = searchQuery.eq('category', category)
        }

        const { data, error } = await searchQuery

        if (error || !data) {
            return []
        }

        // Cache the result
        searchCache.set(cacheKey, data)
        console.log(`💾 Cached search results: ${query}`)

        return data
    } catch (error) {
        console.error('Error searching listings:', error)
        return []
    }
}

// Cache invalidation helpers
export function invalidateUserCache(facebookId: string): void {
    userCache.delete(CacheKeys.user(facebookId))
    userCache.delete(CacheKeys.userListings(facebookId))
    userCache.delete(CacheKeys.userStats(facebookId))
    console.log(`🗑️ Invalidated user cache: ${facebookId}`)
}

export function invalidateListingCache(listingId?: string, category?: string): void {
    if (listingId) {
        listingCache.delete(CacheKeys.listing(listingId))
    }

    if (category) {
        listingCache.delete(CacheKeys.recentListings(category))
    }

    listingCache.delete(CacheKeys.recentListings())
    listingCache.delete(CacheKeys.popularListings())
    console.log(`🗑️ Invalidated listing cache: ${listingId || category || 'all'}`)
}

export function invalidateSearchCache(query?: string): void {
    if (query) {
        searchCache.delete(CacheKeys.searchResults(query))
    } else {
        // Clear all search cache
        searchCache.clear()
        console.log('🗑️ Cleared all search cache')
    }
}

// Performance monitoring
export function getCacheStats(): {
    user: { size: number; maxSize: number }
    listing: { size: number; maxSize: number }
    search: { size: number; maxSize: number }
    admin: { size: number; maxSize: number }
} {
    return {
        user: userCache.getStats(),
        listing: listingCache.getStats(),
        search: searchCache.getStats(),
        admin: adminCache.getStats()
    }
}

// Cache warming for frequently accessed data
export async function warmCache(): Promise<void> {
    console.log('🔥 Warming up cache...')

    try {
        // Warm user cache for active users
        const { supabaseAdmin } = await import('./supabase')
        const { data: activeUsers } = await supabaseAdmin
            .from('users')
            .select('facebook_id')
            .in('status', ['registered', 'trial'])
            .limit(50)

        if (activeUsers) {
            console.log(`🔥 Warming ${activeUsers.length} user caches...`)
            // Implementation would fetch and cache user data
        }

        // Warm popular listings
        await getCachedListings()
        console.log('✅ Cache warming completed')

    } catch (error) {
        console.error('Error warming cache:', error)
    }
}

// Database query optimization
export async function optimizedUserQuery(facebookId: string): Promise<any | null> {
    const cacheKey = CacheKeys.user(facebookId)
    const cached = userCache.get(cacheKey)

    if (cached) {
        return cached
    }

    try {
        const { supabaseAdmin } = await import('./supabase')
        const { data, error } = await supabaseAdmin
            .from('users')
            .select(`
                *,
                payments!payments_user_id_fkey (
                    id, amount, status, created_at
                ),
                listings!listings_user_id_fkey (
                    id, title, status, created_at
                )
            `)
            .eq('facebook_id', facebookId)
            .single()

        if (error || !data) {
            return null
        }

        // Cache the enhanced user data
        userCache.set(cacheKey, data)
        return data

    } catch (error) {
        console.error('Error in optimized user query:', error)
        return null
    }
}

// Batch operations for better performance
export async function batchUserLookup(facebookIds: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>()
    const uncachedIds: string[] = []

    // Check cache first
    for (const facebookId of facebookIds) {
        const cacheKey = CacheKeys.user(facebookId)
        const cached = userCache.get(cacheKey)

        if (cached) {
            result.set(facebookId, cached)
        } else {
            uncachedIds.push(facebookId)
        }
    }

    // Fetch uncached users
    if (uncachedIds.length > 0) {
        try {
            const { supabaseAdmin } = await import('./supabase')
            const { data: users } = await supabaseAdmin
                .from('users')
                .select('*')
                .in('facebook_id', uncachedIds)

            if (users) {
                for (const user of users) {
                    const cacheKey = CacheKeys.user(user.facebook_id)
                    userCache.set(cacheKey, user)
                    result.set(user.facebook_id, user)
                }
            }
        } catch (error) {
            console.error('Error in batch user lookup:', error)
        }
    }

    return result
}

// Memory usage monitoring
export function getMemoryUsage(): {
    cacheSizes: ReturnType<typeof getCacheStats>
    memoryUsage: NodeJS.MemoryUsage
} {
    return {
        cacheSizes: getCacheStats(),
        memoryUsage: process.memoryUsage()
    }
}

// Cache cleanup on memory pressure
export function cleanupCacheOnMemoryPressure(): void {
    const memUsage = process.memoryUsage()
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal

    if (memUsagePercent > 0.8) { // If memory usage > 80%
        console.log('🧹 High memory usage detected, cleaning caches...')

        // Clear oldest entries from all caches
        userCache.clear()
        listingCache.clear()
        searchCache.clear()
        adminCache.clear()

        console.log('✅ All caches cleared due to memory pressure')
    }
}

// Setup periodic cache cleanup
export function setupCacheMaintenance(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
        userCache.cleanExpired()
        listingCache.cleanExpired()
        searchCache.cleanExpired()
        adminCache.cleanExpired()

        // Check memory pressure
        cleanupCacheOnMemoryPressure()
    }, 5 * 60 * 1000)

    // Log cache stats every hour
    setInterval(() => {
        const stats = getCacheStats()
        console.log('📊 Cache Stats:', stats)
    }, 60 * 60 * 1000)
}
