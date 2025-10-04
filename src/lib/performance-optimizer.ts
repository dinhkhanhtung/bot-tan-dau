/**
 * Performance Optimization System
 * Hệ thống tối ưu hóa hiệu suất và scalability toàn diện
 */

import { logger, logPerformance } from './logger'
import { monitoringSystem, recordTimer, recordGauge } from './monitoring-system'
import { CONFIG } from './config'

// Performance metrics
export interface PerformanceMetrics {
    responseTime: number
    throughput: number
    memoryUsage: number
    cpuUsage: number
    errorRate: number
    cacheHitRate: number
    activeConnections: number
    queueSize: number
}

// Optimization strategies
export enum OptimizationStrategy {
    CACHING = 'caching',
    COMPRESSION = 'compression',
    BATCHING = 'batching',
    PARALLEL_PROCESSING = 'parallel_processing',
    CONNECTION_POOLING = 'connection_pooling',
    MEMORY_OPTIMIZATION = 'memory_optimization',
    CPU_OPTIMIZATION = 'cpu_optimization'
}

// Performance optimizer
export class PerformanceOptimizer {
    private static instance: PerformanceOptimizer
    private performanceMetrics: PerformanceMetrics = {
        responseTime: 0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        errorRate: 0,
        cacheHitRate: 0,
        activeConnections: 0,
        queueSize: 0
    }

    private optimizationStrategies: Map<OptimizationStrategy, boolean> = new Map()
    private performanceHistory: PerformanceMetrics[] = []
    private optimizationRules: Map<string, () => void> = new Map()

    private constructor() {
        this.initializeOptimizationStrategies()
        this.startPerformanceMonitoring()
        this.setupOptimizationRules()
    }

    public static getInstance(): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer()
        }
        return PerformanceOptimizer.instance
    }

    // Initialize optimization strategies
    private initializeOptimizationStrategies(): void {
        this.optimizationStrategies.set(OptimizationStrategy.CACHING, true)
        this.optimizationStrategies.set(OptimizationStrategy.COMPRESSION, true)
        this.optimizationStrategies.set(OptimizationStrategy.BATCHING, true)
        this.optimizationStrategies.set(OptimizationStrategy.PARALLEL_PROCESSING, true)
        this.optimizationStrategies.set(OptimizationStrategy.CONNECTION_POOLING, true)
        this.optimizationStrategies.set(OptimizationStrategy.MEMORY_OPTIMIZATION, true)
        this.optimizationStrategies.set(OptimizationStrategy.CPU_OPTIMIZATION, true)
    }

    // Start performance monitoring
    private startPerformanceMonitoring(): void {
        // Monitor performance every 10 seconds
        setInterval(() => {
            this.collectPerformanceMetrics()
        }, 10000)

        // Optimize based on metrics every 30 seconds
        setInterval(() => {
            this.optimizeBasedOnMetrics()
        }, 30000)

        // Clean up performance history every 5 minutes
        setInterval(() => {
            this.cleanupPerformanceHistory()
        }, 300000)
    }

    // Setup optimization rules
    private setupOptimizationRules(): void {
        // High response time rule
        this.optimizationRules.set('high_response_time', () => {
            this.enableCaching()
            this.enableCompression()
            this.enableConnectionPooling()
        })

        // High memory usage rule
        this.optimizationRules.set('high_memory_usage', () => {
            this.enableMemoryOptimization()
            this.enableCaching()
        })

        // High CPU usage rule
        this.optimizationRules.set('high_cpu_usage', () => {
            this.enableCPUOptimization()
            this.enableParallelProcessing()
        })

        // Low throughput rule
        this.optimizationRules.set('low_throughput', () => {
            this.enableBatching()
            this.enableParallelProcessing()
            this.enableConnectionPooling()
        })

        // High error rate rule
        this.optimizationRules.set('high_error_rate', () => {
            this.enableCaching()
            this.enableConnectionPooling()
        })
    }

    // Collect performance metrics
    private collectPerformanceMetrics(): void {
        const memoryUsage = process.memoryUsage()
        const cpuUsage = process.cpuUsage()

        this.performanceMetrics = {
            responseTime: this.calculateAverageResponseTime(),
            throughput: this.calculateThroughput(),
            memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
            cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
            errorRate: this.calculateErrorRate(),
            cacheHitRate: this.calculateCacheHitRate(),
            activeConnections: this.getActiveConnections(),
            queueSize: this.getQueueSize()
        }

        // Record metrics
        recordGauge('performance_response_time', this.performanceMetrics.responseTime)
        recordGauge('performance_throughput', this.performanceMetrics.throughput)
        recordGauge('performance_memory_usage', this.performanceMetrics.memoryUsage)
        recordGauge('performance_cpu_usage', this.performanceMetrics.cpuUsage)
        recordGauge('performance_error_rate', this.performanceMetrics.errorRate)
        recordGauge('performance_cache_hit_rate', this.performanceMetrics.cacheHitRate)

        // Store in history
        this.performanceHistory.push({ ...this.performanceMetrics })

        logger.debug('Performance metrics collected', this.performanceMetrics)
    }

    // Calculate average response time
    private calculateAverageResponseTime(): number {
        const responseTimeMetrics = monitoringSystem.getMetricsSummary()['message_processing_time']
        return responseTimeMetrics?.average || 0
    }

    // Calculate throughput
    private calculateThroughput(): number {
        const throughputMetrics = monitoringSystem.getMetricsSummary()['messages_processed']
        return throughputMetrics?.count || 0
    }

    // Calculate error rate
    private calculateErrorRate(): number {
        const errorMetrics = monitoringSystem.getMetricsSummary()['error_count']
        const totalMetrics = monitoringSystem.getMetricsSummary()['total_operations']
        
        if (!totalMetrics || totalMetrics.count === 0) return 0
        return (errorMetrics?.count || 0) / totalMetrics.count
    }

    // Calculate cache hit rate
    private calculateCacheHitRate(): number {
        const hitMetrics = monitoringSystem.getMetricsSummary()['database_cache_hit']
        const missMetrics = monitoringSystem.getMetricsSummary()['database_cache_miss']
        
        const hits = hitMetrics?.count || 0
        const misses = missMetrics?.count || 0
        const total = hits + misses
        
        return total > 0 ? hits / total : 0
    }

    // Get active connections
    private getActiveConnections(): number {
        // This would typically query the connection pool
        return Math.floor(Math.random() * 10) // Placeholder
    }

    // Get queue size
    private getQueueSize(): number {
        // This would typically query the message queue
        return Math.floor(Math.random() * 5) // Placeholder
    }

    // Optimize based on metrics
    private optimizeBasedOnMetrics(): void {
        const metrics = this.performanceMetrics
        const rules = this.optimizationRules

        // Check high response time
        if (metrics.responseTime > 2000) { // 2 seconds
            rules.get('high_response_time')?.()
            logger.info('Applied high response time optimization')
        }

        // Check high memory usage
        if (metrics.memoryUsage > 0.8) { // 80%
            rules.get('high_memory_usage')?.()
            logger.info('Applied high memory usage optimization')
        }

        // Check high CPU usage
        if (metrics.cpuUsage > 0.7) { // 70%
            rules.get('high_cpu_usage')?.()
            logger.info('Applied high CPU usage optimization')
        }

        // Check low throughput
        if (metrics.throughput < 10) { // Less than 10 messages per minute
            rules.get('low_throughput')?.()
            logger.info('Applied low throughput optimization')
        }

        // Check high error rate
        if (metrics.errorRate > 0.05) { // 5%
            rules.get('high_error_rate')?.()
            logger.info('Applied high error rate optimization')
        }
    }

    // Enable caching optimization
    private enableCaching(): void {
        this.optimizationStrategies.set(OptimizationStrategy.CACHING, true)
        logger.info('Caching optimization enabled')
    }

    // Enable compression optimization
    private enableCompression(): void {
        this.optimizationStrategies.set(OptimizationStrategy.COMPRESSION, true)
        logger.info('Compression optimization enabled')
    }

    // Enable batching optimization
    private enableBatching(): void {
        this.optimizationStrategies.set(OptimizationStrategy.BATCHING, true)
        logger.info('Batching optimization enabled')
    }

    // Enable parallel processing optimization
    private enableParallelProcessing(): void {
        this.optimizationStrategies.set(OptimizationStrategy.PARALLEL_PROCESSING, true)
        logger.info('Parallel processing optimization enabled')
    }

    // Enable connection pooling optimization
    private enableConnectionPooling(): void {
        this.optimizationStrategies.set(OptimizationStrategy.CONNECTION_POOLING, true)
        logger.info('Connection pooling optimization enabled')
    }

    // Enable memory optimization
    private enableMemoryOptimization(): void {
        this.optimizationStrategies.set(OptimizationStrategy.MEMORY_OPTIMIZATION, true)
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc()
            logger.info('Garbage collection triggered')
        }

        logger.info('Memory optimization enabled')
    }

    // Enable CPU optimization
    private enableCPUOptimization(): void {
        this.optimizationStrategies.set(OptimizationStrategy.CPU_OPTIMIZATION, true)
        logger.info('CPU optimization enabled')
    }

    // Optimize function execution
    async optimizeFunction<T>(
        name: string,
        fn: () => Promise<T>,
        options: {
            strategy?: OptimizationStrategy
            cacheKey?: string
            ttl?: number
            parallel?: boolean
        } = {}
    ): Promise<T> {
        const startTime = Date.now()

        try {
            let result: T

            // Apply caching if enabled and cache key provided
            if (options.cacheKey && this.optimizationStrategies.get(OptimizationStrategy.CACHING)) {
                result = await this.executeWithCache(options.cacheKey, fn, options.ttl)
            } else {
                result = await fn()
            }

            const duration = Date.now() - startTime
            recordTimer(`optimized_function_${name}`, duration)

            return result
        } catch (error) {
            const duration = Date.now() - startTime
            recordTimer(`optimized_function_${name}_error`, duration)
            throw error
        }
    }

    // Execute with cache
    private async executeWithCache<T>(
        cacheKey: string,
        fn: () => Promise<T>,
        ttl: number = 300000
    ): Promise<T> {
        // This would integrate with your caching system
        // For now, just execute the function
        return fn()
    }

    // Optimize database queries
    optimizeDatabaseQuery(query: string, params: any[] = []): {
        optimizedQuery: string
        estimatedCost: number
        recommendations: string[]
    } {
        const recommendations: string[] = []
        let optimizedQuery = query
        let estimatedCost = 1

        // Add LIMIT if not present
        if (!query.toLowerCase().includes('limit') && !query.toLowerCase().includes('count')) {
            optimizedQuery += ' LIMIT 1000'
            recommendations.push('Added LIMIT clause to prevent large result sets')
        }

        // Check for missing indexes
        if (query.toLowerCase().includes('where') && !query.toLowerCase().includes('order by')) {
            recommendations.push('Consider adding ORDER BY for consistent results')
        }

        // Check for SELECT *
        if (query.toLowerCase().includes('select *')) {
            recommendations.push('Avoid SELECT * - specify only needed columns')
            estimatedCost += 0.5
        }

        // Check for N+1 queries
        if (query.toLowerCase().includes('select') && params.length > 10) {
            recommendations.push('Consider batching multiple queries')
            estimatedCost += 0.3
        }

        return {
            optimizedQuery,
            estimatedCost,
            recommendations
        }
    }

    // Optimize memory usage
    optimizeMemoryUsage(): {
        before: NodeJS.MemoryUsage
        after: NodeJS.MemoryUsage
        freed: number
    } {
        const before = process.memoryUsage()
        
        // Force garbage collection
        if (global.gc) {
            global.gc()
        }

        const after = process.memoryUsage()
        const freed = before.heapUsed - after.heapUsed

        logger.info('Memory optimization completed', {
            before: before.heapUsed,
            after: after.heapUsed,
            freed
        })

        return { before, after, freed }
    }

    // Get performance recommendations
    getPerformanceRecommendations(): string[] {
        const recommendations: string[] = []
        const metrics = this.performanceMetrics

        if (metrics.responseTime > 1000) {
            recommendations.push('Consider enabling caching to reduce response time')
        }

        if (metrics.memoryUsage > 0.7) {
            recommendations.push('Consider optimizing memory usage or increasing heap size')
        }

        if (metrics.cpuUsage > 0.5) {
            recommendations.push('Consider optimizing CPU-intensive operations')
        }

        if (metrics.errorRate > 0.02) {
            recommendations.push('Consider improving error handling and retry logic')
        }

        if (metrics.cacheHitRate < 0.5) {
            recommendations.push('Consider improving cache strategy')
        }

        if (metrics.throughput < 20) {
            recommendations.push('Consider enabling parallel processing')
        }

        return recommendations
    }

    // Get performance trends
    getPerformanceTrends(): {
        responseTime: { trend: 'up' | 'down' | 'stable'; change: number }
        memoryUsage: { trend: 'up' | 'down' | 'stable'; change: number }
        throughput: { trend: 'up' | 'down' | 'stable'; change: number }
        errorRate: { trend: 'up' | 'down' | 'stable'; change: number }
    } {
        if (this.performanceHistory.length < 2) {
            return {
                responseTime: { trend: 'stable', change: 0 },
                memoryUsage: { trend: 'stable', change: 0 },
                throughput: { trend: 'stable', change: 0 },
                errorRate: { trend: 'stable', change: 0 }
            }
        }

        const recent = this.performanceHistory.slice(-5) // Last 5 measurements
        const older = this.performanceHistory.slice(-10, -5) // Previous 5 measurements

        const calculateTrend = (recent: number[], older: number[]) => {
            const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
            const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length
            const change = ((recentAvg - olderAvg) / olderAvg) * 100

            if (change > 5) return { trend: 'up' as const, change }
            if (change < -5) return { trend: 'down' as const, change }
            return { trend: 'stable' as const, change }
        }

        return {
            responseTime: calculateTrend(
                recent.map(m => m.responseTime),
                older.map(m => m.responseTime)
            ),
            memoryUsage: calculateTrend(
                recent.map(m => m.memoryUsage),
                older.map(m => m.memoryUsage)
            ),
            throughput: calculateTrend(
                recent.map(m => m.throughput),
                older.map(m => m.throughput)
            ),
            errorRate: calculateTrend(
                recent.map(m => m.errorRate),
                older.map(m => m.errorRate)
            )
        }
    }

    // Clean up performance history
    private cleanupPerformanceHistory(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
        this.performanceHistory = this.performanceHistory.filter(
            (_, index) => index % 2 === 0 // Keep every other measurement
        )

        logger.debug('Performance history cleaned up', {
            remainingMeasurements: this.performanceHistory.length
        })
    }

    // Get current performance metrics
    getCurrentMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics }
    }

    // Get optimization status
    getOptimizationStatus(): Record<OptimizationStrategy, boolean> {
        return Object.fromEntries(this.optimizationStrategies) as Record<OptimizationStrategy, boolean>
    }

    // Reset optimization strategies
    resetOptimizationStrategies(): void {
        this.initializeOptimizationStrategies()
        logger.info('Optimization strategies reset')
    }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()
