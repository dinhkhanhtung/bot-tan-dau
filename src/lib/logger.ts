/**
 * Centralized Logging System
 * Hệ thống logging tập trung với cấu trúc và phân cấp rõ ràng
 */

import { CONFIG, LoggingConfig } from './config'
import * as fs from 'fs'
import * as path from 'path'

// Log levels
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

// Log entry interface
export interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: Record<string, any>
    error?: Error
    userId?: string
    sessionId?: string
    requestId?: string
    duration?: number
    metadata?: Record<string, any>
}

// Logger class
export class Logger {
    private static instance: Logger
    private logLevel: LogLevel
    private enableDebug: boolean

    private constructor() {
        this.logLevel = this.parseLogLevel(CONFIG.LOGGING.DEFAULT_LEVEL)
        this.enableDebug = CONFIG.BOT.ENABLE_DEBUG
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger()
        }
        return Logger.instance
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'error': return LogLevel.ERROR
            case 'warn': return LogLevel.WARN
            case 'info': return LogLevel.INFO
            case 'debug': return LogLevel.DEBUG
            default: return LogLevel.INFO
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
        const currentLevelIndex = levels.indexOf(this.logLevel)
        const messageLevelIndex = levels.indexOf(level)
        return messageLevelIndex <= currentLevelIndex
    }

    private formatLogEntry(entry: LogEntry): string {
        const baseInfo = {
            timestamp: entry.timestamp,
            level: entry.level,
            message: entry.message
        }

        const context = entry.context ? { context: entry.context } : {}
        const error = entry.error ? {
            error: {
                name: entry.error.name,
                message: entry.error.message,
                stack: entry.error.stack
            }
        } : {}
        const metadata = entry.metadata ? { metadata: entry.metadata } : {}
        const userInfo = entry.userId ? { userId: entry.userId } : {}
        const sessionInfo = entry.sessionId ? { sessionId: entry.sessionId } : {}
        const requestInfo = entry.requestId ? { requestId: entry.requestId } : {}
        const durationInfo = entry.duration ? { duration: entry.duration } : {}

        return JSON.stringify({
            ...baseInfo,
            ...context,
            ...error,
            ...metadata,
            ...userInfo,
            ...sessionInfo,
            ...requestInfo,
            ...durationInfo
        })
    }

    private writeToRealtimeLog(entry: LogEntry): void {
        try {
            // Only write INFO, WARN, ERROR to realtime log (skip DEBUG unless enabled)
            if (entry.level === LogLevel.DEBUG && !this.enableDebug) {
                return
            }

            const logFile = path.join(process.cwd(), 'realtime-logs.jsonl')
            const logLine = JSON.stringify(entry) + '\n'

            fs.appendFileSync(logFile, logLine)
        } catch (error) {
            // Don't log errors from the logger itself to avoid infinite loops
            console.error('Failed to write to realtime log:', error)
        }
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error, metadata?: Record<string, any>): void {
        if (!this.shouldLog(level)) return

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            error,
            metadata
        }

        const formattedLog = this.formatLogEntry(entry)

        // Console output with appropriate method
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedLog)
                break
            case LogLevel.WARN:
                console.warn(formattedLog)
                break
            case LogLevel.INFO:
                console.info(formattedLog)
                break
            case LogLevel.DEBUG:
                if (this.enableDebug) {
                    console.debug(formattedLog)
                }
                break
        }

        // Write to realtime log file for monitoring
        this.writeToRealtimeLog(entry)
    }

    // Public logging methods
    public error(message: string, context?: Record<string, any>, error?: Error, metadata?: Record<string, any>): void {
        this.log(LogLevel.ERROR, message, context, error, metadata)
    }

    public warn(message: string, context?: Record<string, any>, metadata?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, context, undefined, metadata)
    }

    public info(message: string, context?: Record<string, any>, metadata?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, context, undefined, metadata)
    }

    public debug(message: string, context?: Record<string, any>, metadata?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, context, undefined, metadata)
    }

    // Specialized logging methods
    public logMessage(userId: string, message: string, type: 'received' | 'sent' | 'failed', context?: Record<string, any>): void {
        this.info(`Message ${type}`, {
            userId,
            messageType: type,
            messageLength: message.length
        }, context)
    }

    public logUserAction(userId: string, action: string, context?: Record<string, any>): void {
        this.info(`User action: ${action}`, {
            userId,
            action
        }, context)
    }

    public logBotEvent(event: string, context?: Record<string, any>): void {
        this.info(`Bot event: ${event}`, {
            event
        }, context)
    }

    public logSystemEvent(event: string, context?: Record<string, any>): void {
        this.info(`System event: ${event}`, {
            event
        }, context)
    }

    public logError(error: Error, context?: Record<string, any>, metadata?: Record<string, any>): void {
        this.error(`Error occurred: ${error.message}`, context, error, metadata)
    }

    public logPerformance(operation: string, duration: number, context?: Record<string, any>): void {
        this.info(`Performance: ${operation}`, {
            operation,
            duration: `${duration}ms`
        }, context)
    }

    public logDatabaseQuery(query: string, duration: number, context?: Record<string, any>): void {
        this.debug(`Database query executed`, {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            duration: `${duration}ms`
        }, context)
    }

    public logApiCall(url: string, method: string, statusCode: number, duration: number, context?: Record<string, any>): void {
        this.info(`API call: ${method} ${url}`, {
            url,
            method,
            statusCode,
            duration: `${duration}ms`
        }, context)
    }

    public logSpamDetection(userId: string, reason: string, action: string, context?: Record<string, any>): void {
        this.warn(`Spam detected`, {
            userId,
            reason,
            action
        }, context)
    }

    public logAdminAction(adminId: string, action: string, targetId?: string, context?: Record<string, any>): void {
        this.info(`Admin action: ${action}`, {
            adminId,
            action,
            targetId
        }, context)
    }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export convenience functions
export const logError = (error: Error, context?: Record<string, any>, metadata?: Record<string, any>) =>
    logger.logError(error, context, metadata)

export const logInfo = (message: string, context?: Record<string, any>, metadata?: Record<string, any>) =>
    logger.info(message, context, metadata)

export const logWarn = (message: string, context?: Record<string, any>, metadata?: Record<string, any>) =>
    logger.warn(message, context, metadata)

export const logDebug = (message: string, context?: Record<string, any>, metadata?: Record<string, any>) =>
    logger.debug(message, context, metadata)

export const logMessage = (userId: string, message: string, type: 'received' | 'sent' | 'failed', context?: Record<string, any>) =>
    logger.logMessage(userId, message, type, context)

export const logUserAction = (userId: string, action: string, context?: Record<string, any>) =>
    logger.logUserAction(userId, action, context)

export const logBotEvent = (event: string, context?: Record<string, any>) =>
    logger.logBotEvent(event, context)

export const logSystemEvent = (event: string, context?: Record<string, any>) =>
    logger.logSystemEvent(event, context)

export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) =>
    logger.logPerformance(operation, duration, context)

export const logDatabaseQuery = (query: string, duration: number, context?: Record<string, any>) =>
    logger.logDatabaseQuery(query, duration, context)

export const logApiCall = (url: string, method: string, statusCode: number, duration: number, context?: Record<string, any>) =>
    logger.logApiCall(url, method, statusCode, duration, context)

export const logSpamDetection = (userId: string, reason: string, action: string, context?: Record<string, any>) =>
    logger.logSpamDetection(userId, reason, action, context)

export const logAdminAction = (adminId: string, action: string, targetId?: string, context?: Record<string, any>) =>
    logger.logAdminAction(adminId, action, targetId, context)

export default logger
