/**
 * Advanced Security System
 * Hệ thống bảo mật nâng cao với validation, rate limiting và threat detection
 */

import { logger, logError } from './logger'
import { monitoringSystem, recordCounter } from './monitoring-system'
import { CONFIG } from './config'
import crypto from 'crypto'

// Security threat levels
export enum ThreatLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Security event types
export enum SecurityEventType {
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    INVALID_INPUT = 'invalid_input',
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    MALICIOUS_PAYLOAD = 'malicious_payload',
    BRUTE_FORCE_ATTEMPT = 'brute_force_attempt'
}

// Security event
export interface SecurityEvent {
    id: string
    type: SecurityEventType
    level: ThreatLevel
    userId?: string
    ipAddress?: string
    userAgent?: string
    details: Record<string, any>
    timestamp: number
    resolved: boolean
}

// Rate limiting configuration
export interface RateLimitConfig {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
    skipFailedRequests: boolean
    keyGenerator?: (req: any) => string
}

// Security manager
export class SecurityManager {
    private static instance: SecurityManager
    private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map()
    private securityEvents: SecurityEvent[] = []
    private blockedUsers: Set<string> = new Set()
    private suspiciousIPs: Set<string> = new Set()
    private maliciousPatterns: RegExp[] = []

    private constructor() {
        this.initializeMaliciousPatterns()
        this.startSecurityMonitoring()
    }

    public static getInstance(): SecurityManager {
        if (!SecurityManager.instance) {
            SecurityManager.instance = new SecurityManager()
        }
        return SecurityManager.instance
    }

    // Initialize malicious patterns
    private initializeMaliciousPatterns(): void {
        this.maliciousPatterns = [
            // SQL injection patterns
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(;|\-\-|\/\*|\*\/)/,

            // XSS patterns
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,

            // Command injection patterns
            /[;&|`$()]/,
            /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)\b/i,

            // Path traversal patterns
            /\.\.\//,
            /\.\.\\/,

            // NoSQL injection patterns
            /\$where|\$ne|\$gt|\$lt|\$regex/i,

            // LDAP injection patterns
            /[()=*!&|]/,

            // XML injection patterns
            /<!\[CDATA\[|<!DOCTYPE|<!ENTITY/i,

            // Spam patterns
            /(viagra|cialis|casino|poker|lottery|winner|free money)/i,

            // Phishing patterns
            /(click here|verify account|update information|urgent action)/i
        ]
    }

    // Start security monitoring
    private startSecurityMonitoring(): void {
        // Clean up old events every 5 minutes
        setInterval(() => {
            this.cleanupOldEvents()
        }, 300000)

        // Reset rate limiters every minute
        setInterval(() => {
            this.resetRateLimiters()
        }, 60000)

        // Monitor blocked users every 10 minutes
        setInterval(() => {
            this.monitorBlockedUsers()
        }, 600000)
    }

    // Validate input
    validateInput(input: string, type: 'text' | 'email' | 'phone' | 'url' | 'json' = 'text'): {
        isValid: boolean
        sanitized: string
        threats: string[]
    } {
        const threats: string[] = []
        let sanitized = input

        // Check for malicious patterns
        for (const pattern of this.maliciousPatterns) {
            if (pattern.test(input)) {
                threats.push(`Malicious pattern detected: ${pattern.source}`)
            }
        }

        // Sanitize input
        sanitized = this.sanitizeInput(input, type)

        // Type-specific validation
        switch (type) {
            case 'email':
                if (!this.isValidEmail(sanitized)) {
                    threats.push('Invalid email format')
                }
                break
            case 'phone':
                if (!this.isValidPhone(sanitized)) {
                    threats.push('Invalid phone format')
                }
                break
            case 'url':
                if (!this.isValidURL(sanitized)) {
                    threats.push('Invalid URL format')
                }
                break
            case 'json':
                if (!this.isValidJSON(sanitized)) {
                    threats.push('Invalid JSON format')
                }
                break
        }

        // Check for suspicious length
        if (input.length > 10000) {
            threats.push('Input too long')
        }

        const isValid = threats.length === 0

        if (!isValid) {
            this.recordSecurityEvent(SecurityEventType.INVALID_INPUT, ThreatLevel.MEDIUM, {
                input: input.substring(0, 100),
                type,
                threats
            })
        }

        return { isValid, sanitized, threats }
    }

    // Sanitize input
    private sanitizeInput(input: string, type: string): string {
        let sanitized = input

        // Remove null bytes
        sanitized = sanitized.replace(/\0/g, '')

        // Remove control characters except newlines and tabs
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

        // HTML encode special characters
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')

        return sanitized
    }

    // Validate email
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    // Validate phone
    private isValidPhone(phone: string): boolean {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/
        return phoneRegex.test(phone)
    }

    // Validate URL
    private isValidURL(url: string): boolean {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    // Validate JSON
    private isValidJSON(json: string): boolean {
        try {
            JSON.parse(json)
            return true
        } catch {
            return false
        }
    }

    // Rate limiting
    checkRateLimit(
        identifier: string,
        config: RateLimitConfig = {
            windowMs: 60000, // 1 minute
            maxRequests: 60,
            skipSuccessfulRequests: false,
            skipFailedRequests: false
        }
    ): { allowed: boolean; remaining: number; resetTime: number } {
        const now = Date.now()
        const key = `rate_limit:${identifier}`
        const limiter = this.rateLimiters.get(key)

        if (!limiter || now > limiter.resetTime) {
            // Reset or create new limiter
            this.rateLimiters.set(key, {
                count: 1,
                resetTime: now + config.windowMs
            })

            recordCounter('rate_limit_check', 1, { identifier, allowed: 'true' })
            return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs }
        }

        if (limiter.count >= config.maxRequests) {
            this.recordSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, ThreatLevel.MEDIUM, {
                identifier,
                count: limiter.count,
                maxRequests: config.maxRequests
            })

            recordCounter('rate_limit_exceeded', 1, { identifier })
            return { allowed: false, remaining: 0, resetTime: limiter.resetTime }
        }

        limiter.count++
        this.rateLimiters.set(key, limiter)

        recordCounter('rate_limit_check', 1, { identifier, allowed: 'true' })
        return { allowed: true, remaining: config.maxRequests - limiter.count, resetTime: limiter.resetTime }
    }

    // Check for suspicious activity
    checkSuspiciousActivity(
        userId: string,
        activity: string,
        context: Record<string, any> = {}
    ): { suspicious: boolean; score: number; reasons: string[] } {
        const reasons: string[] = []
        let score = 0

        // Check for rapid requests
        const recentRequests = this.getRecentRequests(userId, 60000) // Last minute
        if (recentRequests > 30) {
            reasons.push('Too many requests in short time')
            score += 30
        }

        // Check for unusual patterns
        if (this.hasUnusualPatterns(activity)) {
            reasons.push('Unusual activity pattern')
            score += 20
        }

        // Check for blocked user
        if (this.blockedUsers.has(userId)) {
            reasons.push('User is blocked')
            score += 50
        }

        // Check for suspicious IP
        if (context.ipAddress && this.suspiciousIPs.has(context.ipAddress)) {
            reasons.push('Suspicious IP address')
            score += 25
        }

        // Check for malicious content
        const validation = this.validateInput(activity)
        if (!validation.isValid) {
            reasons.push('Malicious content detected')
            score += 40
        }

        const suspicious = score >= 50

        if (suspicious) {
            this.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY,
                score >= 80 ? ThreatLevel.HIGH : ThreatLevel.MEDIUM, {
                userId,
                activity: activity.substring(0, 100),
                score,
                reasons,
                ...context
            })
        }

        return { suspicious, score, reasons }
    }

    // Get recent requests count
    private getRecentRequests(userId: string, timeWindow: number): number {
        const now = Date.now()
        const cutoff = now - timeWindow

        // This would typically query a database or cache
        // For now, we'll use a simple approximation
        return Math.floor(Math.random() * 10) // Placeholder
    }

    // Check for unusual patterns
    private hasUnusualPatterns(activity: string): boolean {
        // Check for repetitive patterns
        const words = activity.toLowerCase().split(/\s+/)
        const wordCounts = new Map<string, number>()

        for (const word of words) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        }

        // If any word appears more than 5 times, it's suspicious
        for (const count of Array.from(wordCounts.values())) {
            if (count > 5) {
                return true
            }
        }

        // Check for very long messages
        if (activity.length > 5000) {
            return true
        }

        // Check for excessive special characters
        const specialCharCount = (activity.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length
        if (specialCharCount > activity.length * 0.3) {
            return true
        }

        return false
    }

    // Block user
    blockUser(userId: string, reason: string, duration: number = 0): void {
        this.blockedUsers.add(userId)

        this.recordSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, ThreatLevel.HIGH, {
            userId,
            reason,
            duration,
            action: 'blocked'
        })

        logger.warn('User blocked', { userId, reason, duration })

        // Auto-unblock after duration if specified
        if (duration > 0) {
            setTimeout(() => {
                this.unblockUser(userId)
            }, duration)
        }
    }

    // Unblock user
    unblockUser(userId: string): void {
        this.blockedUsers.delete(userId)
        logger.info('User unblocked', { userId })
    }

    // Check if user is blocked
    isUserBlocked(userId: string): boolean {
        return this.blockedUsers.has(userId)
    }

    // Add suspicious IP
    addSuspiciousIP(ipAddress: string, reason: string): void {
        this.suspiciousIPs.add(ipAddress)

        this.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, ThreatLevel.MEDIUM, {
            ipAddress,
            reason,
            action: 'ip_flagged'
        })

        logger.warn('Suspicious IP flagged', { ipAddress, reason })
    }

    // Check if IP is suspicious
    isIPSuspicious(ipAddress: string): boolean {
        return this.suspiciousIPs.has(ipAddress)
    }

    // Record security event
    recordSecurityEvent(
        type: SecurityEventType,
        level: ThreatLevel,
        details: Record<string, any>
    ): void {
        const event: SecurityEvent = {
            id: crypto.randomUUID(),
            type,
            level,
            details,
            timestamp: Date.now(),
            resolved: false
        }

        this.securityEvents.push(event)

        // Keep only last 1000 events
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(-1000)
        }

        // Log security event
        logger.warn('Security event recorded', {
            type,
            level,
            details
        })

        // Record metrics
        recordCounter('security_event', 1, { type, level })

        // Send alert for high/critical threats
        if (level === ThreatLevel.HIGH || level === ThreatLevel.CRITICAL) {
            this.sendSecurityAlert(event)
        }
    }

    // Send security alert
    private sendSecurityAlert(event: SecurityEvent): void {
        logger.error('SECURITY ALERT', {
            id: event.id,
            type: event.type,
            level: event.level,
            details: event.details,
            timestamp: event.timestamp
        })

        // Here you would typically send to external monitoring system
        // e.g., Slack, email, webhook, etc.
    }

    // Generate secure token
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex')
    }

    // Hash sensitive data
    hashSensitiveData(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex')
    }

    // Verify hash
    verifyHash(data: string, hash: string): boolean {
        return this.hashSensitiveData(data) === hash
    }

    // Clean up old events
    private cleanupOldEvents(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
        this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoff)
    }

    // Reset rate limiters
    private resetRateLimiters(): void {
        const now = Date.now()
        for (const [key, limiter] of Array.from(this.rateLimiters)) {
            if (now > limiter.resetTime) {
                this.rateLimiters.delete(key)
            }
        }
    }

    // Monitor blocked users
    private monitorBlockedUsers(): void {
        logger.info('Blocked users monitoring', {
            blockedCount: this.blockedUsers.size,
            suspiciousIPs: this.suspiciousIPs.size
        })
    }

    // Get security statistics
    getSecurityStats(): {
        totalEvents: number
        eventsByType: Record<SecurityEventType, number>
        eventsByLevel: Record<ThreatLevel, number>
        blockedUsers: number
        suspiciousIPs: number
        recentThreats: SecurityEvent[]
    } {
        const eventsByType: Record<SecurityEventType, number> = {} as any
        const eventsByLevel: Record<ThreatLevel, number> = {} as any

        // Initialize counters
        Object.values(SecurityEventType).forEach(type => {
            eventsByType[type] = 0
        })
        Object.values(ThreatLevel).forEach(level => {
            eventsByLevel[level] = 0
        })

        // Count events
        for (const event of this.securityEvents) {
            eventsByType[event.type]++
            eventsByLevel[event.level]++
        }

        // Get recent threats (last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000)
        const recentThreats = this.securityEvents
            .filter(e => e.timestamp > oneHourAgo && e.level !== ThreatLevel.LOW)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)

        return {
            totalEvents: this.securityEvents.length,
            eventsByType,
            eventsByLevel,
            blockedUsers: this.blockedUsers.size,
            suspiciousIPs: this.suspiciousIPs.size,
            recentThreats
        }
    }

    // Resolve security event
    resolveSecurityEvent(eventId: string): void {
        const event = this.securityEvents.find(e => e.id === eventId)
        if (event) {
            event.resolved = true
            logger.info('Security event resolved', { eventId })
        }
    }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance()
