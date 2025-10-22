/**
 * Logs API Endpoint
 * API để truy cập log data từ web interface
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Types for log analysis
interface LogStats {
    total: number
    byLevel: Record<string, number>
    byType: Record<string, number>
    recentActivity: any[]
    errors: any[]
    performance: any[]
    userActions: any[]
    botEvents: any[]
    spamDetections: any[]
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '100')
        const level = searchParams.get('level') // error, warn, info, debug
        const type = searchParams.get('type') // message, userAction, botEvent, welcome, spam
        const userId = searchParams.get('userId')

        // Đọc log file
        const logFile = path.join(process.cwd(), 'realtime-logs.jsonl')

        if (!fs.existsSync(logFile)) {
            return NextResponse.json({
                success: true,
                logs: [],
                total: 0,
                stats: {
                    byLevel: {},
                    byType: {},
                    recentActivity: []
                }
            })
        }

        const content = fs.readFileSync(logFile, 'utf8')
        const allLogs = content.split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line)
                } catch {
                    return null
                }
            })
            .filter(log => log !== null)
            .reverse() // Mới nhất trước

        // Filter theo điều kiện
        let filteredLogs = allLogs

        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level)
        }

        if (type) {
            if (type === 'message') {
                filteredLogs = filteredLogs.filter(log => log.message && log.message.includes('Message'))
            } else if (type === 'userAction') {
                filteredLogs = filteredLogs.filter(log => log.message && log.message.includes('User action'))
            } else if (type === 'botEvent') {
                filteredLogs = filteredLogs.filter(log => log.message && log.message.includes('Bot event'))
            } else if (type === 'welcome') {
                filteredLogs = filteredLogs.filter(log => log.message && log.message.includes('welcome_sent'))
            } else if (type === 'spam') {
                filteredLogs = filteredLogs.filter(log => log.message && log.message.includes('Spam detected'))
            }
        }

        if (userId) {
            filteredLogs = filteredLogs.filter(log =>
                log.userId === userId ||
                (log.context && log.context.userId === userId)
            )
        }

        // Giới hạn số lượng
        const limitedLogs = filteredLogs.slice(0, limit)

        // Tính toán thống kê
        const stats: LogStats = calculateStats(allLogs)

        return NextResponse.json({
            success: true,
            logs: limitedLogs,
            total: filteredLogs.length,
            available: allLogs.length,
            stats: stats
        })

    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch logs',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

// Tính toán thống kê từ logs
function calculateStats(logs: any[]): LogStats {
    const stats: LogStats = {
        total: logs.length,
        byLevel: {},
        byType: {},
        recentActivity: [],
        errors: [],
        performance: [],
        userActions: [],
        botEvents: [],
        spamDetections: []
    }

    logs.forEach(log => {
        // Đếm theo level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1

        // Đếm theo loại hoạt động
        if (log.message) {
            if (log.message.includes('Message')) {
                stats.byType.message = (stats.byType.message || 0) + 1
            }
            if (log.message.includes('User action')) {
                stats.byType.userAction = (stats.byType.userAction || 0) + 1
            }
            if (log.message.includes('Bot event')) {
                stats.byType.botEvent = (stats.byType.botEvent || 0) + 1
            }
            if (log.message.includes('welcome_sent')) {
                stats.byType.welcome = (stats.byType.welcome || 0) + 1
            }
            if (log.message.includes('Spam detected')) {
                stats.byType.spam = (stats.byType.spam || 0) + 1
            }
        }

        // Thu thập thông tin chi tiết
        if (log.level === 'error') {
            stats.errors.push({
                time: log.timestamp,
                message: log.message,
                userId: log.userId || log.context?.userId
            })
        }

        if (log.message && log.message.includes('Performance')) {
            stats.performance.push({
                time: log.timestamp,
                operation: log.context?.operation,
                duration: log.context?.duration
            })
        }

        if (log.message && log.message.includes('User action')) {
            stats.userActions.push({
                time: log.timestamp,
                userId: log.userId || log.context?.userId,
                action: log.context?.action
            })
        }

        if (log.message && log.message.includes('Bot event')) {
            stats.botEvents.push({
                time: log.timestamp,
                event: log.context?.event,
                userId: log.userId || log.context?.userId
            })
        }

        if (log.message && log.message.includes('Spam detected')) {
            stats.spamDetections.push({
                time: log.timestamp,
                userId: log.userId || log.context?.userId,
                reason: log.context?.reason,
                action: log.context?.action
            })
        }
    })

    // Lấy 10 hoạt động gần nhất
    stats.recentActivity = logs.slice(0, 10).map(log => ({
        time: log.timestamp,
        level: log.level,
        message: log.message,
        userId: log.userId || log.context?.userId
    }))

    return stats
}
