/**
 * Advanced Monitoring and Analytics System
 * Hệ thống giám sát và phân tích hiệu suất toàn diện
 */

import { logger, logPerformance } from './logger'
import { CONFIG } from './config'

// Metrics types
export enum MetricType {
    COUNTER = 'counter',
    GAUGE = 'gauge',
    HISTOGRAM = 'histogram',
    TIMER = 'timer'
}

// Metric data structure
export interface Metric {
    name: string
    type: MetricType
    value: number
    timestamp: number
    labels: Record<string, string>
    metadata?: Record<string, any>
}

// Performance metrics
export interface PerformanceMetrics {
    messageProcessingTime: number
    databaseQueryTime: number
    apiResponseTime: number
    cacheHitRate: number
    errorRate: number
    throughput: number
    activeUsers: number
    memoryUsage: number
    cpuUsage: number
}

// Alert configuration
export interface AlertConfig {
    metric: string
    threshold: number
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    severity: 'low' | 'medium' | 'high' | 'critical'
    enabled: boolean
    cooldown: number // seconds
}

// Alert data
export interface Alert {
    id: string
    metric: string
    value: number
    threshold: number
    severity: string
    timestamp: number
    message: string
    resolved: boolean
}

// Monitoring system
export class MonitoringSystem {
    private static instance: MonitoringSystem
    private metrics: Map<string, Metric[]> = new Map()
    private alerts: Alert[] = []
    private alertConfigs: Map<string, AlertConfig> = new Map()
    private lastAlertTimes: Map<string, number> = new Map()
    private performanceMetrics: PerformanceMetrics = {
        messageProcessingTime: 0,
        databaseQueryTime: 0,
        apiResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughput: 0,
        activeUsers: 0,
        memoryUsage: 0,
        cpuUsage: 0
    }

    private constructor() {
        this.initializeAlertConfigs()
        this.startMetricsCollection()
    }

    public static getInstance(): MonitoringSystem {
        if (!MonitoringSystem.instance) {
            MonitoringSystem.instance = new MonitoringSystem()
        }
        return MonitoringSystem.instance
    }

    // Initialize default alert configurations
    private initializeAlertConfigs(): void {
        this.alertConfigs.set('high_error_rate', {
            metric: 'error_rate',
            threshold: 0.1, // 10%
            operator: 'gt',
            severity: 'high',
            enabled: true,
            cooldown: 300 // 5 minutes
        })

        this.alertConfigs.set('slow_response_time', {
            metric: 'messageProcessingTime',
            threshold: 5000, // 5 seconds
            operator: 'gt',
            severity: 'medium',
            enabled: true,
            cooldown: 600 // 10 minutes
        })

        this.alertConfigs.set('high_memory_usage', {
            metric: 'memoryUsage',
            threshold: 0.9, // 90%
            operator: 'gt',
            severity: 'critical',
            enabled: true,
            cooldown: 300 // 5 minutes
        })

        this.alertConfigs.set('low_cache_hit_rate', {
            metric: 'cacheHitRate',
            threshold: 0.5, // 50%
            operator: 'lt',
            severity: 'medium',
            enabled: true,
            cooldown: 900 // 15 minutes
        })
    }

    // Start metrics collection
    private startMetricsCollection(): void {
        // Collect system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics()
        }, 30000)

        // Clean up old metrics every 5 minutes
        setInterval(() => {
            this.cleanupOldMetrics()
        }, 300000)

        // Check alerts every 10 seconds
        setInterval(() => {
            this.checkAlerts()
        }, 10000)
    }

    // Record a metric
    recordMetric(
        name: string,
        type: MetricType,
        value: number,
        labels: Record<string, string> = {},
        metadata?: Record<string, any>
    ): void {
        const metric: Metric = {
            name,
            type,
            value,
            timestamp: Date.now(),
            labels,
            metadata
        }

        if (!this.metrics.has(name)) {
            this.metrics.set(name, [])
        }

        this.metrics.get(name)!.push(metric)

        // Keep only last 1000 metrics per name
        const metrics = this.metrics.get(name)!
        if (metrics.length > 1000) {
            metrics.splice(0, metrics.length - 1000)
        }

        logger.debug('Metric recorded', { name, type, value, labels })
    }

    // Record counter metric
    recordCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
        this.recordMetric(name, MetricType.COUNTER, value, labels)
    }

    // Record gauge metric
    recordGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        this.recordMetric(name, MetricType.GAUGE, value, labels)
    }

    // Record histogram metric
    recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
        this.recordMetric(name, MetricType.HISTOGRAM, value, labels)
    }

    // Record timer metric
    recordTimer(name: string, duration: number, labels: Record<string, string> = {}): void {
        this.recordMetric(name, MetricType.TIMER, duration, labels)
    }

    // Time a function execution
    async timeFunction<T>(
        name: string,
        fn: () => Promise<T>,
        labels: Record<string, string> = {}
    ): Promise<T> {
        const startTime = Date.now()
        try {
            const result = await fn()
            const duration = Date.now() - startTime
            this.recordTimer(name, duration, { ...labels, success: 'true' })
            return result
        } catch (error) {
            const duration = Date.now() - startTime
            this.recordTimer(name, duration, { ...labels, success: 'false' })
            throw error
        }
    }

    // Collect system metrics
    private collectSystemMetrics(): void {
        try {
            // Memory usage
            const memoryUsage = process.memoryUsage()
            this.recordGauge('memory_usage_bytes', memoryUsage.heapUsed, { type: 'heap' })
            this.recordGauge('memory_usage_bytes', memoryUsage.heapTotal, { type: 'heap_total' })
            this.recordGauge('memory_usage_bytes', memoryUsage.rss, { type: 'rss' })

            // CPU usage (simplified)
            const cpuUsage = process.cpuUsage()
            this.recordGauge('cpu_usage_microseconds', cpuUsage.user, { type: 'user' })
            this.recordGauge('cpu_usage_microseconds', cpuUsage.system, { type: 'system' })

            // Update performance metrics
            this.updatePerformanceMetrics()

        } catch (error) {
            logger.error('Failed to collect system metrics', { error: error instanceof Error ? error.message : String(error) })
        }
    }

    // Update performance metrics
    private updatePerformanceMetrics(): void {
        const now = Date.now()
        const oneMinuteAgo = now - 60000

        // Calculate message processing time
        const messageProcessingMetrics = this.getMetricsInRange('message_processing_time', oneMinuteAgo, now)
        if (messageProcessingMetrics.length > 0) {
            this.performanceMetrics.messageProcessingTime =
                messageProcessingMetrics.reduce((sum, m) => sum + m.value, 0) / messageProcessingMetrics.length
        }

        // Calculate database query time
        const databaseQueryMetrics = this.getMetricsInRange('database_query_time', oneMinuteAgo, now)
        if (databaseQueryMetrics.length > 0) {
            this.performanceMetrics.databaseQueryTime =
                databaseQueryMetrics.reduce((sum, m) => sum + m.value, 0) / databaseQueryMetrics.length
        }

        // Calculate error rate
        const errorMetrics = this.getMetricsInRange('error_count', oneMinuteAgo, now)
        const totalMetrics = this.getMetricsInRange('total_operations', oneMinuteAgo, now)
        if (totalMetrics.length > 0) {
            const totalErrors = errorMetrics.reduce((sum, m) => sum + m.value, 0)
            const totalOperations = totalMetrics.reduce((sum, m) => sum + m.value, 0)
            this.performanceMetrics.errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0
        }

        // Calculate throughput
        const throughputMetrics = this.getMetricsInRange('messages_processed', oneMinuteAgo, now)
        this.performanceMetrics.throughput = throughputMetrics.reduce((sum, m) => sum + m.value, 0)

        // Calculate cache hit rate
        const cacheHitMetrics = this.getMetricsInRange('cache_hit', oneMinuteAgo, now)
        const cacheMissMetrics = this.getMetricsInRange('cache_miss', oneMinuteAgo, now)
        const totalCacheRequests = cacheHitMetrics.reduce((sum, m) => sum + m.value, 0) +
            cacheMissMetrics.reduce((sum, m) => sum + m.value, 0)
        this.performanceMetrics.cacheHitRate = totalCacheRequests > 0 ?
            cacheHitMetrics.reduce((sum, m) => sum + m.value, 0) / totalCacheRequests : 0

        // Memory usage percentage
        const memoryUsage = process.memoryUsage()
        this.performanceMetrics.memoryUsage = memoryUsage.heapUsed / memoryUsage.heapTotal
    }

    // Get metrics in time range
    private getMetricsInRange(name: string, startTime: number, endTime: number): Metric[] {
        const metrics = this.metrics.get(name) || []
        return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
    }

    // Check alerts
    private checkAlerts(): void {
        for (const [alertName, config] of Array.from(this.alertConfigs)) {
            if (!config.enabled) continue

            const currentValue = this.getCurrentMetricValue(config.metric)
            if (currentValue === null) continue

            const shouldAlert = this.evaluateAlertCondition(currentValue, config)
            if (shouldAlert) {
                this.triggerAlert(alertName, config, currentValue)
            }
        }
    }

    // Get current metric value
    private getCurrentMetricValue(metricName: string): number | null {
        const metrics = this.metrics.get(metricName)
        if (!metrics || metrics.length === 0) return null

        // Get the latest metric
        const latestMetric = metrics[metrics.length - 1]
        return latestMetric.value
    }

    // Evaluate alert condition
    private evaluateAlertCondition(value: number, config: AlertConfig): boolean {
        switch (config.operator) {
            case 'gt': return value > config.threshold
            case 'lt': return value < config.threshold
            case 'eq': return value === config.threshold
            case 'gte': return value >= config.threshold
            case 'lte': return value <= config.threshold
            default: return false
        }
    }

    // Trigger alert
    private triggerAlert(alertName: string, config: AlertConfig, currentValue: number): void {
        const now = Date.now()
        const lastAlertTime = this.lastAlertTimes.get(alertName) || 0

        // Check cooldown
        if (now - lastAlertTime < config.cooldown * 1000) {
            return
        }

        const alert: Alert = {
            id: `${alertName}_${now}`,
            metric: config.metric,
            value: currentValue,
            threshold: config.threshold,
            severity: config.severity,
            timestamp: now,
            message: `${config.metric} is ${currentValue} (threshold: ${config.threshold})`,
            resolved: false
        }

        this.alerts.push(alert)
        this.lastAlertTimes.set(alertName, now)

        logger.warn('Alert triggered', {
            alertName,
            metric: config.metric,
            value: currentValue,
            threshold: config.threshold,
            severity: config.severity
        })

        // Send alert notification (implement based on your notification system)
        this.sendAlertNotification(alert)
    }

    // Send alert notification
    private sendAlertNotification(alert: Alert): void {
        // Implement alert notification logic
        // This could send to Slack, email, webhook, etc.
        logger.error('ALERT', {
            id: alert.id,
            message: alert.message,
            severity: alert.severity,
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold
        })
    }

    // Clean up old metrics
    private cleanupOldMetrics(): void {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago

        for (const [name, metrics] of Array.from(this.metrics)) {
            const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime)
            this.metrics.set(name, filteredMetrics)
        }

        // Clean up old alerts
        this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime)

        logger.debug('Cleaned up old metrics and alerts', {
            metricsCleaned: true,
            alertsCleaned: true
        })
    }

    // Get performance metrics
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics }
    }

    // Get metrics summary
    getMetricsSummary(): Record<string, any> {
        const summary: Record<string, any> = {}

        for (const [name, metrics] of Array.from(this.metrics)) {
            if (metrics.length === 0) continue

            const latest = metrics[metrics.length - 1]
            const avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
            const min = Math.min(...metrics.map(m => m.value))
            const max = Math.max(...metrics.map(m => m.value))

            summary[name] = {
                count: metrics.length,
                latest: latest.value,
                average: avg,
                min,
                max,
                lastUpdated: latest.timestamp
            }
        }

        return summary
    }

    // Get active alerts
    getActiveAlerts(): Alert[] {
        return this.alerts.filter(a => !a.resolved)
    }

    // Resolve alert
    resolveAlert(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId)
        if (alert) {
            alert.resolved = true
            logger.info('Alert resolved', { alertId })
        }
    }

    // Add custom alert configuration
    addAlertConfig(name: string, config: AlertConfig): void {
        this.alertConfigs.set(name, config)
        logger.info('Alert configuration added', { name, config })
    }

    // Remove alert configuration
    removeAlertConfig(name: string): void {
        this.alertConfigs.delete(name)
        logger.info('Alert configuration removed', { name })
    }

    // Get all metrics
    getAllMetrics(): Record<string, Metric[]> {
        return Object.fromEntries(this.metrics)
    }

    // Clear all metrics
    clearAllMetrics(): void {
        this.metrics.clear()
        this.alerts = []
        this.lastAlertTimes.clear()
        logger.info('All metrics cleared')
    }
}

// Export singleton instance
export const monitoringSystem = MonitoringSystem.getInstance()

// Convenience functions
export const recordMetric = (name: string, type: MetricType, value: number, labels?: Record<string, string>) =>
    monitoringSystem.recordMetric(name, type, value, labels)

export const recordCounter = (name: string, value?: number, labels?: Record<string, string>) =>
    monitoringSystem.recordCounter(name, value, labels)

export const recordGauge = (name: string, value: number, labels?: Record<string, string>) =>
    monitoringSystem.recordGauge(name, value, labels)

export const recordTimer = (name: string, duration: number, labels?: Record<string, string>) =>
    monitoringSystem.recordTimer(name, duration, labels)

export const timeFunction = <T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>) =>
    monitoringSystem.timeFunction(name, fn, labels)
