// Integration Layer - Kết nối tất cả hệ thống Bot Tân Dậu 1981

// Initialize all systems
export async function initializeBotSystems() {
    console.log('🚀 Initializing Bot Tân Dậu 1981 systems...')

    try {
        // Setup cache maintenance
        const { setupCacheMaintenance } = await import('./cache')
        setupCacheMaintenance()

        // Warm up cache
        const { warmCache } = await import('./cache')
        await warmCache()

        console.log('✅ All systems initialized successfully')

        // Send system ready notification to admins
        await notifyAdminsSystemReady()

    } catch (error) {
        console.error('❌ Error initializing systems:', error)
        await notifyAdminsSystemError(error)
    }
}

// Notify admins when system is ready
async function notifyAdminsSystemReady() {
    try {
        const { supabaseAdmin } = await import('./supabase')
        const { data: admins } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('is_active', true)

        if (admins && admins.length > 0) {
            const { sendMessage } = await import('./facebook-api')

            const readyMessage = `🟢 SYSTEM READY
⏰ ${new Date().toLocaleString('vi-VN')}
✅ Bot Tân Dậu 1981 đã sẵn sàng phục vụ!

🚀 Các tính năng mới:
• Enhanced Admin Dashboard
• Advanced Payment Tracking
• Automated Cron Jobs
• Visual Search Results
• Performance Optimization
• Error Handling & Retry Logic

📊 Hệ thống đang hoạt động ổn định!`

            for (const admin of admins) {
                try {
                    await sendMessage(admin.facebook_id, readyMessage)
                } catch (error) {
                    console.error(`Failed to notify admin ${admin.facebook_id}`)
                }
            }
        }
    } catch (error) {
        console.error('Error notifying admins:', error)
    }
}

// Notify admins on system error
async function notifyAdminsSystemError(error: any) {
    try {
        const { supabaseAdmin } = await import('./supabase')
        const { data: admins } = await supabaseAdmin
            .from('admin_users')
            .select('facebook_id')
            .eq('is_active', true)

        if (admins && admins.length > 0) {
            const { sendMessage } = await import('./facebook-api')

            const errorMsg = (error as any)?.message || 'Unknown error'
            const errorMessage = `🔴 SYSTEM ERROR
⏰ ${new Date().toLocaleString('vi-VN')}
❌ Lỗi khởi tạo hệ thống!

🔍 Chi tiết:
${errorMsg}

💡 Vui lòng kiểm tra:
• Database connection
• Environment variables
• System logs
• Network connectivity`

            for (const admin of admins) {
                try {
                    await sendMessage(admin.facebook_id, errorMessage)
                } catch (sendError) {
                    console.error(`Failed to send error notification to ${admin.facebook_id}`)
                }
            }
        }
    } catch (notifyError) {
        console.error('Error sending system error notification:', notifyError)
    }
}

// Enhanced user lookup with caching and error handling
export async function getEnhancedUser(facebookId: string) {
    const { getCachedUser } = await import('./cache')
    return getCachedUser(facebookId)
}

// Enhanced listing lookup with caching
export async function getEnhancedListings(category?: string, limit: number = 20) {
    const { getCachedListings } = await import('./cache')
    return getCachedListings(category, limit)
}

// Real-time system monitoring
export async function getSystemStatus() {
    try {
        const { getCacheStats, getMemoryUsage } = await import('./cache')
        const { supabaseAdmin } = await import('./supabase')

        // Get database status
        const dbStart = Date.now()
        const { error: dbError } = await supabaseAdmin.from('users').select('id').limit(1)
        const dbLatency = Date.now() - dbStart

        // Get cache stats
        const cacheStats = getCacheStats()
        const memoryUsage = getMemoryUsage()

        // Calculate system health score
        let healthScore = 100

        if (dbError) healthScore -= 50
        if (dbLatency > 1000) healthScore -= 20
        if (memoryUsage.memoryUsage.heapUsed / memoryUsage.memoryUsage.heapTotal > 0.8) healthScore -= 15
        if (cacheStats.user.size === 0) healthScore -= 10

        const status = {
            healthy: healthScore >= 70,
            score: healthScore,
            database: {
                connected: !dbError,
                latency: dbLatency,
                status: dbError ? 'error' : dbLatency > 1000 ? 'slow' : 'good'
            },
            cache: cacheStats,
            memory: {
                usage: Math.round((memoryUsage.memoryUsage.heapUsed / memoryUsage.memoryUsage.heapTotal) * 100),
                heapUsed: Math.round(memoryUsage.memoryUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.memoryUsage.heapTotal / 1024 / 1024)
            },
            timestamp: new Date().toISOString()
        }

        return status
    } catch (error) {
        console.error('Error getting system status:', error)
        return {
            healthy: false,
            score: 0,
            error: (error as any)?.message,
            timestamp: new Date().toISOString()
        }
    }
}

// Health check endpoint
export async function healthCheck() {
    const systemStatus = await getSystemStatus()

    const result: any = {
        status: systemStatus.healthy ? 'healthy' : 'unhealthy',
        score: systemStatus.score,
        timestamp: systemStatus.timestamp,
        uptime: process.uptime(),
        version: '2.0.0-enhanced'
    }

    // Add database and memory info if available
    if ('database' in systemStatus && systemStatus.database) {
        result.database = systemStatus.database
    }
    if ('memory' in systemStatus && systemStatus.memory) {
        result.memory = systemStatus.memory
    }
    if ('cache' in systemStatus && systemStatus.cache) {
        result.cache = systemStatus.cache
    }

    return result
}

// System optimization utilities
export async function optimizeSystem() {
    console.log('🔧 Optimizing system performance...')

    try {
        // Clear expired cache
        const { userCache, listingCache, searchCache, adminCache } = await import('./cache')
        userCache.cleanExpired()
        listingCache.cleanExpired()
        searchCache.cleanExpired()
        adminCache.cleanExpired()

        // Memory cleanup
        if (global.gc) {
            global.gc()
        }

        console.log('✅ System optimization completed')

    } catch (error) {
        console.error('Error optimizing system:', error)
    }
}
