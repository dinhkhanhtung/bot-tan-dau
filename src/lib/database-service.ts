/**
 * Optimized Database Service
 * Service database tối ưu hóa với caching và connection pooling
 */

import { supabaseAdmin } from './supabase'
import { CONFIG, DatabaseConfig } from './config'
import { logger, logDatabaseQuery, logPerformance } from './logger'
import { errorHandler, createDatabaseError, ErrorType } from './error-handler'
import { cacheQuery, invalidateUserCache, invalidateBotCache, invalidatePattern } from './cache'

// Database service class
export class DatabaseService {
    private static instance: DatabaseService
    private queryCount = 0
    private totalQueryTime = 0

    private constructor() { }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService()
        }
        return DatabaseService.instance
    }

    // Execute query with caching and error handling
    private async executeQuery<T>(
        queryName: string,
        queryFn: () => Promise<T>,
        cacheKey?: string,
        ttl?: number
    ): Promise<T> {
        const startTime = Date.now()
        this.queryCount++

        try {
            let result: T

            if (cacheKey) {
                result = await cacheQuery(cacheKey, queryFn, ttl)
            } else {
                result = await queryFn()
            }

            const duration = Date.now() - startTime
            this.totalQueryTime += duration

            logDatabaseQuery(queryName, duration, { cacheKey, cached: !!cacheKey })
            logPerformance(`Database query: ${queryName}`, duration)

            return result
        } catch (error) {
            const duration = Date.now() - startTime
            const dbError = createDatabaseError(`Query failed: ${queryName}`, {
                queryName,
                duration,
                cacheKey
            })

            logger.error(`Database query failed: ${queryName}`, {
                duration,
                cacheKey
            }, error as Error)

            throw errorHandler.handleError(dbError)
        }
    }

    // User operations
    public async getUserByFacebookId(facebookId: string) {
        return this.executeQuery(
            'getUserByFacebookId',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .select('*')
                    .eq('facebook_id', facebookId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw error
                }

                return data
            },
            `user:${facebookId}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async createUser(userData: any) {
        return this.executeQuery(
            'createUser',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .insert(userData)
                    .select()
                    .single()

                if (error) throw error

                // Invalidate user cache
                invalidateUserCache(userData.facebook_id)

                return data
            }
        )
    }

    public async updateUser(facebookId: string, updates: any) {
        return this.executeQuery(
            'updateUser',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .update(updates)
                    .eq('facebook_id', facebookId)
                    .select()
                    .single()

                if (error) throw error

                // Invalidate user cache
                invalidateUserCache(facebookId)

                return data
            }
        )
    }

    public async deleteUser(facebookId: string) {
        return this.executeQuery(
            'deleteUser',
            async () => {
                const { error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .delete()
                    .eq('facebook_id', facebookId)

                if (error) throw error

                // Invalidate user cache
                invalidateUserCache(facebookId)

                return true
            }
        )
    }

    // Bot settings operations
    public async getBotSettings() {
        return this.executeQuery(
            'getBotSettings',
            async () => {
                try {
                    const { data, error } = await supabaseAdmin
                        .from(CONFIG.DATABASE.TABLES.BOT_SETTINGS)
                        .select('*')

                    if (error) {
                        // If table doesn't exist, return empty array
                        if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
                            logger.warn('Bot settings table not found, returning empty settings', { error: error.message })
                            return []
                        }
                        throw error
                    }

                    return data || []
                } catch (error) {
                    // Fallback to empty array if any error occurs
                    logger.warn('Failed to get bot settings, returning empty', { error: error instanceof Error ? error.message : String(error) })
                    return []
                }
            },
            'bot:settings',
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async getBotStatus() {
        return this.executeQuery(
            'getBotStatus',
            async () => {
                try {
                    const { data, error } = await supabaseAdmin
                        .from(CONFIG.DATABASE.TABLES.BOT_SETTINGS)
                        .select('value')
                        .eq('key', 'bot_status')
                        .single()

                    if (error) {
                        // If table doesn't exist or other error, return default status
                        if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
                            logger.warn('Bot settings table not found, using default status', { error: error.message })
                            return 'running'
                        }
                        throw error
                    }

                    return data?.value || 'running'
                } catch (error) {
                    // Fallback to default status if any error occurs
                    logger.warn('Failed to get bot status, using default', { error: error instanceof Error ? error.message : String(error) })
                    return 'running'
                }
            },
            'bot:status',
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async updateBotStatus(status: string) {
        return this.executeQuery(
            'updateBotStatus',
            async () => {
                try {
                    const { error } = await supabaseAdmin
                        .from(CONFIG.DATABASE.TABLES.BOT_SETTINGS)
                        .upsert({ key: 'bot_status', value: status })

                    if (error) {
                        // If table doesn't exist, just log warning and continue
                        if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
                            logger.warn('Bot settings table not found, cannot update status', { error: error.message })
                            return true
                        }
                        throw error
                    }

                    // Invalidate bot cache
                    invalidateBotCache()

                    return true
                } catch (error) {
                    // Fallback: just log warning and continue
                    logger.warn('Failed to update bot status', { error: error instanceof Error ? error.message : String(error) })
                    return true
                }
            }
        )
    }

    // Session operations
    public async getBotSession(facebookId: string) {
        return this.executeQuery(
            'getBotSession',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.SESSIONS)
                    .select('*')
                    .eq('user_id', facebookId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw error
                }

                return data
            },
            `session:${facebookId}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async updateBotSession(facebookId: string, sessionData: any) {
        return this.executeQuery(
            'updateBotSession',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.SESSIONS)
                    .upsert({
                        user_id: facebookId,
                        session_data: sessionData,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (error) throw error

                // Invalidate session cache
                invalidateUserCache(facebookId)

                return data
            }
        )
    }

    public async deleteBotSession(facebookId: string) {
        return this.executeQuery(
            'deleteBotSession',
            async () => {
                const { error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.SESSIONS)
                    .delete()
                    .eq('user_id', facebookId)

                if (error) throw error

                // Invalidate session cache
                invalidateUserCache(facebookId)

                return true
            }
        )
    }

    // Spam tracking operations
    public async getSpamData(userId: string) {
        return this.executeQuery(
            'getSpamData',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.SPAM_TRACKING)
                    .select('*')
                    .eq('user_id', userId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw error
                }

                return data
            },
            `spam:${userId}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async updateSpamData(userId: string, updates: any) {
        return this.executeQuery(
            'updateSpamData',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.SPAM_TRACKING)
                    .upsert({
                        user_id: userId,
                        ...updates,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (error) throw error

                // Invalidate spam cache
                invalidateUserCache(userId)

                return data
            }
        )
    }

    // Message operations
    public async logMessage(userId: string, content: string, messageId: string) {
        return this.executeQuery(
            'logMessage',
            async () => {
                const { error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.MESSAGES)
                    .insert({
                        user_id: userId,
                        content: content,
                        message_id: messageId,
                        created_at: new Date().toISOString()
                    })

                if (error) throw error

                return true
            }
        )
    }

    // Listings operations
    public async getListings(filters?: any) {
        return this.executeQuery(
            'getListings',
            async () => {
                let query = supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.LISTINGS)
                    .select('*')

                if (filters) {
                    if (filters.category) {
                        query = query.eq('category', filters.category)
                    }
                    if (filters.location) {
                        query = query.eq('location', filters.location)
                    }
                    if (filters.price_min) {
                        query = query.gte('price', filters.price_min)
                    }
                    if (filters.price_max) {
                        query = query.lte('price', filters.price_max)
                    }
                }

                const { data, error } = await query

                if (error) throw error

                return data
            },
            `listings:${JSON.stringify(filters || {})}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async createListing(listingData: any) {
        return this.executeQuery(
            'createListing',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.LISTINGS)
                    .insert(listingData)
                    .select()
                    .single()

                if (error) throw error

                // Invalidate listings cache
                invalidatePattern('listings:')

                return data
            }
        )
    }

    // Batch operations
    public async batchUpdate(updates: Array<{ table: string; data: any; where: any }>) {
        return this.executeQuery(
            'batchUpdate',
            async () => {
                const results = []

                for (const update of updates) {
                    const { data, error } = await supabaseAdmin
                        .from(update.table)
                        .update(update.data)
                        .match(update.where)
                        .select()

                    if (error) throw error
                    results.push(data)
                }

                return results
            }
        )
    }

    // Get database statistics
    public getStats() {
        return {
            queryCount: this.queryCount,
            totalQueryTime: this.totalQueryTime,
            averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0
        }
    }

    // Reset statistics
    public resetStats() {
        this.queryCount = 0
        this.totalQueryTime = 0
    }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance()

// Export convenience functions
export const getUserByFacebookId = (facebookId: string) =>
    dbService.getUserByFacebookId(facebookId)

export const createUser = (userData: any) =>
    dbService.createUser(userData)

export const updateUser = (facebookId: string, updates: any) =>
    dbService.updateUser(facebookId, updates)

export const deleteUser = (facebookId: string) =>
    dbService.deleteUser(facebookId)

export const getBotSettings = () =>
    dbService.getBotSettings()

export const getBotStatus = () =>
    dbService.getBotStatus()

export const updateBotStatus = (status: string) =>
    dbService.updateBotStatus(status)

export const getBotSession = (facebookId: string) =>
    dbService.getBotSession(facebookId)

export const updateBotSession = (facebookId: string, sessionData: any) =>
    dbService.updateBotSession(facebookId, sessionData)

export const deleteBotSession = (facebookId: string) =>
    dbService.deleteBotSession(facebookId)

export const getSpamData = (userId: string) =>
    dbService.getSpamData(userId)

export const updateSpamData = (userId: string, updates: any) =>
    dbService.updateSpamData(userId, updates)

export const logMessage = (userId: string, content: string, messageId: string) =>
    dbService.logMessage(userId, content, messageId)

export const getListings = (filters?: any) =>
    dbService.getListings(filters)

export const createListing = (listingData: any) =>
    dbService.createListing(listingData)

export const batchUpdate = (updates: Array<{ table: string; data: any; where: any }>) =>
    dbService.batchUpdate(updates)

export const getDatabaseStats = () =>
    dbService.getStats()

export const resetDatabaseStats = () =>
    dbService.resetStats()

// Export the service instance
export { dbService as databaseService }

export default dbService
