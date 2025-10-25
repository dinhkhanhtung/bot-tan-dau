/**
 * Integration Service
 * Health check and system integration
 */

import { logger } from './logger'
import { getBotStatus } from './database-service'
import { CONFIG } from './config'

// Health check interface
interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'error'
    timestamp: string
    services: {
        database: boolean
        facebook: boolean
        supabase: boolean
    }
    uptime: number
    version: string
}

// Perform health check
export async function healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
        logger.info('Performing health check')

        // Check database connection
        const dbHealthy = await checkDatabaseHealth()

        // Check Facebook API (basic check)
        const facebookHealthy = await checkFacebookHealth()

        // Check Supabase connection
        const supabaseHealthy = await checkSupabaseHealth()

        const allHealthy = dbHealthy && facebookHealthy && supabaseHealthy

        const health: HealthStatus = {
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealthy,
                facebook: facebookHealthy,
                supabase: supabaseHealthy
            },
            uptime: Date.now() - startTime,
            version: '1.0.0'
        }

        logger.info('Health check completed', { health })
        return health

    } catch (error) {
        logger.error('Health check failed', { error })

        return {
            status: 'error',
            timestamp: new Date().toISOString(),
            services: {
                database: false,
                facebook: false,
                supabase: false
            },
            uptime: Date.now() - startTime,
            version: '1.0.0'
        }
    }
}

// Check database health
async function checkDatabaseHealth(): Promise<boolean> {
    try {
        // Simple query to check database connection
        await getBotStatus()
        return true
    } catch (error) {
        logger.error('Database health check failed', { error })
        return false
    }
}

// Check Facebook API health
async function checkFacebookHealth(): Promise<boolean> {
    try {
        // Check if Facebook config is available
        return !!(CONFIG.BOT.PAGE_ACCESS_TOKEN && CONFIG.BOT.APP_ID)
    } catch (error) {
        logger.error('Facebook health check failed', { error })
        return false
    }
}

// Check Supabase health
async function checkSupabaseHealth(): Promise<boolean> {
    try {
        // Check if Supabase config is available
        return !!(CONFIG.SUPABASE.URL && CONFIG.SUPABASE.ANON_KEY)
    } catch (error) {
        logger.error('Supabase health check failed', { error })
        return false
    }
}
