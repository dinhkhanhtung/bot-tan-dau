/**
 * Unified Database Service
 * Centralized database operations for users, bot sessions, settings, and more
 * Consolidates functionality from BotService, UserService, and core database operations
 */

import { supabaseAdmin } from './supabase'
import { CONFIG, DatabaseConfig } from './config'
import { logger, logDatabaseQuery, logPerformance } from './logger'
import { errorHandler, createDatabaseError, ErrorType } from './error-handler'
import { cacheQuery, invalidateUserCache, invalidateBotCache, invalidatePattern } from './cache'

// Re-export types from original services for backward compatibility
export interface BotSession {
  id?: string
  facebook_id: string
  session_data?: any
  current_flow?: string | null
  step?: number
  current_step?: number
  data?: any
  created_at?: string
  updated_at?: string
}

export interface SessionData {
  current_flow?: string | null
  step?: number
  current_step?: number
  data?: any
}

export interface User {
  id?: string
  facebook_id: string
  name?: string | null
  phone?: string | null
  status?: string | null
  membership_expires_at?: string | null
  trial_end?: string | null
  welcome_sent?: boolean
  welcome_message_sent?: boolean
  last_welcome_sent?: string
  created_at?: string
  updated_at?: string
}

export interface UserUpdates {
  name?: string | null
  phone?: string | null
  status?: string | null
  membership_expires_at?: string | null
  trial_end?: string | null
  welcome_sent?: boolean
  welcome_message_sent?: boolean
  last_welcome_sent?: string
  updated_at?: string
}

export interface BotSettings {
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

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

                // Handle both "no rows" and "multiple rows" errors
                if (error && error.code !== 'PGRST116' && !error.message.includes('Cannot coerce the result to a single JSON object')) {
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
                // First get the user ID to delete by facebook_id
                const { data: user, error: userError } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .select('id, name')
                    .eq('facebook_id', facebookId)
                    .single()

                if (userError || !user) {
                    throw new Error(`User not found: ${facebookId}`)
                }

                // Delete user by ID (CASCADE will handle related records)
                const { error } = await supabaseAdmin
                    .from(CONFIG.DATABASE.TABLES.USERS)
                    .delete()
                    .eq('id', user.id)

                if (error) throw error

                // Additional cleanup for tables that don't have CASCADE
                // (These should be handled by CASCADE, but let's be safe)

                // Clean up user_interactions
                await supabaseAdmin
                    .from('user_interactions')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Clean up bot_sessions
                await supabaseAdmin
                    .from('bot_sessions')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Clean up admin_takeover_states
                await supabaseAdmin
                    .from('admin_takeover_states')
                    .delete()
                    .eq('user_id', facebookId)

                // Clean up admin_chat_sessions
                await supabaseAdmin
                    .from('admin_chat_sessions')
                    .delete()
                    .eq('user_facebook_id', facebookId)

                // Clean up spam_tracking
                await supabaseAdmin
                    .from('spam_tracking')
                    .delete()
                    .eq('user_id', facebookId)

                // Clean up user_activities
                await supabaseAdmin
                    .from('user_activities')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Clean up user_activity_logs
                await supabaseAdmin
                    .from('user_activity_logs')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Clean up chat_bot_offer_counts
                await supabaseAdmin
                    .from('chat_bot_offer_counts')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Clean up user_bot_modes
                await supabaseAdmin
                    .from('user_bot_modes')
                    .delete()
                    .eq('facebook_id', facebookId)

                // Invalidate user cache
                invalidateUserCache(facebookId)

                console.log(`✅ User ${user.name} (${facebookId}) deleted successfully with all related data`)

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

    // Session operations - FIXED VERSION
    public async getBotSession(facebookId: string) {
        return this.executeQuery(
            'getBotSession',
            async () => {
                try {
                    // Use facebook_id directly (matching database schema)
                    const { data, error } = await supabaseAdmin
                        .from('bot_sessions')
                        .select('*')
                        .eq('facebook_id', facebookId)
                        .maybeSingle()  // Use maybeSingle() instead of single() to avoid error when no rows

                    if (error) {
                        // If table doesn't exist or other error, return null
                        if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
                            logger.warn('Bot sessions table not found, returning null', { error: error.message })
                            return null
                        }
                        throw error
                    }

                    // STANDARDIZE SESSION DATA FORMAT
                    if (data) {
                        // Ensure consistent session data structure - FIX STEP HANDLING
                        let stepValue: number = 0

                        if (data.step !== undefined && data.step !== null) {
                            stepValue = typeof data.step === 'string' ? parseInt(data.step) || 0 : data.step
                        } else if (data.current_step !== undefined && data.current_step !== null) {
                            stepValue = typeof data.current_step === 'string' ? parseInt(data.current_step) || 0 : data.current_step
                        }

                        const standardizedSession = {
                            id: data.id,
                            facebook_id: data.facebook_id,
                            session_data: data.session_data || {},
                            current_flow: data.current_flow || null,
                            step: stepValue,  // Always use numeric step
                            current_step: stepValue,  // Keep both for compatibility
                            data: data.data || {},  // Ensure data field exists
                            created_at: data.created_at,
                            updated_at: data.updated_at
                        }

                        logger.debug('Standardized session data', {
                            facebook_id: facebookId,
                            current_flow: standardizedSession.current_flow,
                            step: standardizedSession.step,
                            current_step: standardizedSession.current_step,
                            original_step: data.step,
                            original_current_step: data.current_step
                        })

                        return standardizedSession
                    }

                    return null
                } catch (error) {
                    // Fallback to null if any error occurs
                    logger.warn('Failed to get bot session, returning null', { error: error instanceof Error ? error.message : String(error) })
                    return null
                }
            },
            `session:${facebookId}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async updateBotSession(facebookId: string, sessionData: any) {
        return this.executeQuery(
            'updateBotSession',
            async () => {
                try {
                    // Validate input parameters
                    if (!facebookId || typeof facebookId !== 'string') {
                        throw new Error(`Invalid facebookId: ${facebookId}`)
                    }

                    if (!sessionData || typeof sessionData !== 'object') {
                        throw new Error(`Invalid sessionData: ${sessionData}`)
                    }

                    // Use facebook_id directly (matching database schema)
                    const { data, error } = await supabaseAdmin
                        .from('bot_sessions')
                        .upsert({
                            facebook_id: facebookId,
                            current_flow: sessionData?.current_flow || null,
                            current_step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                            step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0, // FIX: Use INTEGER for step column
                            data: sessionData?.data || {},
                            updated_at: new Date().toISOString()
                        })
                        .select()
                        .single()

                    if (error) {
                        // Handle specific error cases
                        if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
                            logger.warn('Bot sessions table not found, cannot update session', {
                                facebookId,
                                error: error.message,
                                code: error.code
                            })
                            // Return a standardized session object instead of null
                            return {
                                facebook_id: facebookId,
                                current_flow: sessionData?.current_flow || null,
                                step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                                current_step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                                data: sessionData?.data || {},
                                updated_at: new Date().toISOString()
                            }
                        }

                        // For other errors, log details and throw them to be handled by error handler
                        logger.error('Bot session update failed', {
                            facebookId,
                            sessionData,
                            error: error.message,
                            code: error.code,
                            details: error.details,
                            hint: error.hint
                        })
                        throw error
                    }

                    // Ensure we return a valid session object
                    if (!data) {
                        logger.warn('No data returned from session update, creating fallback', { facebookId })
                        return {
                            facebook_id: facebookId,
                            current_flow: sessionData?.current_flow || null,
                            step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                            current_step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                            data: sessionData?.data || {},
                            updated_at: new Date().toISOString()
                        }
                    }

                    // Invalidate session cache
                    invalidateUserCache(facebookId)

                    return data
                } catch (error) {
                    // Log the error but don't swallow it completely
                    logger.error('Exception in bot session update', {
                        facebookId,
                        error: error instanceof Error ? error.message : String(error),
                        sessionData: JSON.stringify(sessionData)
                    })

                    // Return a fallback session object instead of null
                    return {
                        facebook_id: facebookId,
                        current_flow: sessionData?.current_flow || null,
                        step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                        current_step: sessionData?.step ? parseInt(String(sessionData.step)) || 0 : 0,
                        data: sessionData?.data || {},
                        updated_at: new Date().toISOString()
                    }
                }
            }
        )
    }

    public async deleteBotSession(facebookId: string) {
        return this.executeQuery(
            'deleteBotSession',
            async () => {
                try {
                    // Use facebook_id directly (matching database schema)
                    const { error } = await supabaseAdmin
                        .from('bot_sessions')
                        .delete()
                        .eq('facebook_id', facebookId)

                    if (error) {
                        // If table doesn't exist or other error, just log warning and continue
                        if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
                            logger.warn('Bot sessions table not found, cannot delete session', { error: error.message })
                            return true
                        }
                        throw error
                    }

                    // Invalidate session cache
                    invalidateUserCache(facebookId)

                    return true
                } catch (error) {
                    // Fallback: just log warning and continue
                    logger.warn('Failed to delete bot session', { error: error instanceof Error ? error.message : String(error) })
                    return true
                }
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

    // User service methods (from UserService)
    public async userExists(facebookId: string): Promise<boolean> {
        try {
            const user = await this.getUserByFacebookId(facebookId)
            return user !== null
        } catch (error) {
            logger.error('Error checking if user exists', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            })
            return false
        }
    }

    // Get basic user info (from UserService)
    public async getUserBasicInfo(facebookId: string): Promise<Pick<User, 'facebook_id' | 'name' | 'status'> | null> {
        try {
            const user = await this.getUserByFacebookId(facebookId)
            if (!user) return null

            return {
                facebook_id: user.facebook_id,
                name: user.name,
                status: user.status
            }
        } catch (error) {
            logger.error('Error getting user basic info', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            })
            return null
        }
    }

    // Bot service methods (from BotService)
    public async getBotSettingByKey(key: string): Promise<string | null> {
        try {
            if (!key || typeof key !== 'string') {
                throw new Error(`Invalid key: ${key}`)
            }

            const settings = await this.getBotSettings()
            const setting = settings.find(s => s.key === key)

            return setting ? setting.value : null
        } catch (error) {
            logger.error('Error getting bot setting by key', {
                key,
                error: error instanceof Error ? error.message : String(error)
            })
            return null
        }
    }

    public async sessionExists(facebookId: string): Promise<boolean> {
        try {
            const session = await this.getBotSession(facebookId)
            return session !== null
        } catch (error) {
            logger.error('Error checking if session exists', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            })
            return false
        }
    }

    public async createSessionIfNotExists(facebookId: string, initialData?: SessionData): Promise<BotSession> {
        try {
            const existingSession = await this.getBotSession(facebookId)

            if (existingSession) {
                return existingSession
            }

            const defaultData: SessionData = {
                current_flow: null,
                step: 0,
                current_step: 0,
                data: {},
                ...initialData
            }

            return await this.updateBotSession(facebookId, defaultData)
        } catch (error) {
            logger.error('Error creating session if not exists', {
                facebookId,
                initialData,
                error: error instanceof Error ? error.message : String(error)
            })
            throw errorHandler.handleError(createDatabaseError('Failed to create session if not exists', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            }))
        }
    }

    public async clearSessionData(facebookId: string): Promise<BotSession> {
        try {
            const sessionData: SessionData = {
                current_flow: null,
                step: 0,
                current_step: 0,
                data: {}
            }

            return await this.updateBotSession(facebookId, sessionData)
        } catch (error) {
            logger.error('Error clearing session data', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            })
            throw errorHandler.handleError(createDatabaseError('Failed to clear session data', {
                facebookId,
                error: error instanceof Error ? error.message : String(error)
            }))
        }
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

    // Admin Takeover States operations
    public async getAdminTakeoverState(userId: string) {
        return this.executeQuery(
            'getAdminTakeoverState',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select('*')
                    .eq('user_facebook_id', userId)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    throw error
                }

                return data
            },
            `takeover_state:${userId}`,
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async upsertAdminTakeoverState(userId: string, stateData: any) {
        return this.executeQuery(
            'upsertAdminTakeoverState',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .upsert({
                        user_facebook_id: userId,
                        ...stateData,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (error) throw error

                // Invalidate takeover state cache
                invalidatePattern(`takeover_state:${userId}`)

                return data
            }
        )
    }

    public async deleteAdminTakeoverState(userId: string) {
        return this.executeQuery(
            'deleteAdminTakeoverState',
            async () => {
                const { error } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .delete()
                    .eq('user_facebook_id', userId)

                if (error) throw error

                // Invalidate takeover state cache
                invalidatePattern(`takeover_state:${userId}`)

                return true
            }
        )
    }

    public async getUsersWaitingForAdmin() {
        return this.executeQuery(
            'getUsersWaitingForAdmin',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select('user_facebook_id')
                    .eq('user_waiting_for_admin', true)
                    .eq('is_active', false)

                if (error) throw error

                return data?.map(item => item.user_facebook_id) || []
            },
            'waiting_users',
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async getActiveTakeovers() {
        return this.executeQuery(
            'getActiveTakeovers',
            async () => {
                const { data, error } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select(`
                        *,
                        users:user_facebook_id (
                            facebook_id,
                            name,
                            phone,
                            status
                        )
                    `)
                    .eq('is_active', true)

                if (error) throw error

                return data || []
            },
            'active_takeovers',
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    public async getTakeoverStats() {
        return this.executeQuery(
            'getTakeoverStats',
            async () => {
                // Đếm user đang chờ admin
                const { count: waitingCount } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_waiting_for_admin', true)
                    .eq('is_active', false)

                // Đếm takeover đang active
                const { count: activeCount } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)

                // Đếm takeover trong ngày hôm nay
                const today = new Date().toISOString().split('T')[0]
                const { count: todayCount } = await supabaseAdmin
                    .from('admin_takeover_states')
                    .select('*', { count: 'exact', head: true })
                    .gte('takeover_started_at', today)
                    .eq('is_active', true)

                return {
                    totalWaitingUsers: waitingCount || 0,
                    totalActiveTakeovers: activeCount || 0,
                    totalTodayTakeovers: todayCount || 0
                }
            },
            'takeover_stats',
            CONFIG.DATABASE.CACHE_TTL
        )
    }

    // User level calculation methods
    public calculateUserLevel(points: number): string {
        if (points >= 1000) return 'Bạch kim'
        if (points >= 500) return 'Vàng'
        if (points >= 200) return 'Bạc'
        return 'Đồng'
    }

    public getLevelSuggestions(currentLevel: string, currentPoints: number): string {
        switch (currentLevel) {
            case 'Đồng':
                const pointsToSilver = 200 - currentPoints
                return `💡 GỢI Ý: Đăng ${Math.ceil(pointsToSilver / 10)} tin bán để lên Bạc!`
            case 'Bạc':
                const pointsToGold = 500 - currentPoints
                return `💡 GỢI Ý: Đăng ${Math.ceil(pointsToGold / 10)} tin và đánh giá 5 sản phẩm để lên Vàng!`
            case 'Vàng':
                const pointsToPlatinum = 1000 - currentPoints
                return `💡 GỢI Ý: Giới thiệu ${Math.ceil(pointsToPlatinum / 50)} bạn bè để đạt Bạch kim!`
            case 'Bạch kim':
                return `💡 CHÚC MỪNG! Bạn đã đạt cấp độ cao nhất!`
            default:
                return `💡 GỢI Ý: Tiếp tục tích điểm để thăng hạng!`
        }
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

export const userExists = (facebookId: string) =>
    dbService.userExists(facebookId)

export const getUserBasicInfo = (facebookId: string) =>
    dbService.getUserBasicInfo(facebookId)

export const getBotSettings = () =>
    dbService.getBotSettings()

export const getBotStatus = () =>
    dbService.getBotStatus()

export const updateBotStatus = (status: string) =>
    dbService.updateBotStatus(status)

export const getBotSettingByKey = (key: string) =>
    dbService.getBotSettingByKey(key)

export const getBotSession = (facebookId: string) =>
    dbService.getBotSession(facebookId)

export const updateBotSession = (facebookId: string, sessionData: any) =>
    dbService.updateBotSession(facebookId, sessionData)

export const deleteBotSession = (facebookId: string) =>
    dbService.deleteBotSession(facebookId)

export const sessionExists = (facebookId: string) =>
    dbService.sessionExists(facebookId)

export const createSessionIfNotExists = (facebookId: string, initialData?: SessionData) =>
    dbService.createSessionIfNotExists(facebookId, initialData)

export const clearSessionData = (facebookId: string) =>
    dbService.clearSessionData(facebookId)

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

// Admin Takeover States operations exports
export const getAdminTakeoverState = (userId: string) =>
    dbService.getAdminTakeoverState(userId)

export const upsertAdminTakeoverState = (userId: string, stateData: any) =>
    dbService.upsertAdminTakeoverState(userId, stateData)

export const deleteAdminTakeoverState = (userId: string) =>
    dbService.deleteAdminTakeoverState(userId)

export const getUsersWaitingForAdmin = () =>
    dbService.getUsersWaitingForAdmin()

export const getActiveTakeovers = () =>
    dbService.getActiveTakeovers()

export const getTakeoverStats = () =>
    dbService.getTakeoverStats()

export const calculateUserLevel = (points: number) =>
    dbService.calculateUserLevel(points)

export const getLevelSuggestions = (currentLevel: string, currentPoints: number) =>
    dbService.getLevelSuggestions(currentLevel, currentPoints)

// Export the service instance
export { dbService as databaseService }

export default dbService
