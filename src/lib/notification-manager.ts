import { supabaseAdmin } from './supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from './facebook-api'
import { isTrialUser, isExpiredUser, daysUntilExpiry, formatCurrency } from './utils'

export interface NotificationContext {
    user: any
    currentFlow?: string | null
    lastNotification?: string | null
    notificationCount?: number
    userBehavior?: 'active' | 'passive' | 'new'
    chatType?: 'bot' | 'admin' | 'regular'
}

export interface NotificationRule {
    id: string
    name: string
    priority: number // Higher number = higher priority
    conditions: NotificationCondition[]
    actions: NotificationAction[]
    cooldown?: number // Minutes to wait before showing again
    maxPerDay?: number // Maximum times to show per day
}

export interface NotificationCondition {
    type: 'user_status' | 'trial_days' | 'flow_state' | 'last_notification' | 'user_behavior' | 'chat_type'
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains'
    value: any
}

export interface NotificationAction {
    type: 'send_message' | 'send_quick_reply' | 'send_typing' | 'delay'
    content?: string | string[] | any
    delay?: number
}

export class NotificationManager {
    private static instance: NotificationManager
    private rules: NotificationRule[] = []
    private userNotificationHistory = new Map<string, { timestamp: number, ruleId: string }[]>()

    private constructor() {
        this.initializeRules()
        this.setupCleanup()
    }

    public static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager()
        }
        return NotificationManager.instance
    }

    private initializeRules() {
        this.rules = [
            // Trial expiring notification - HIGH PRIORITY but smart
            {
                id: 'trial_expiring_smart',
                name: 'Trial Expiring Smart',
                priority: 100,
                conditions: [
                    { type: 'user_status', operator: 'equals', value: 'trial' },
                    { type: 'trial_days', operator: 'less_than', value: 3 },
                    { type: 'flow_state', operator: 'not_equals', value: 'payment' },
                    { type: 'chat_type', operator: 'equals', value: 'bot' }
                ],
                actions: [
                    { type: 'send_typing' },
                    { type: 'send_message', content: 'trial_expiring_message' },
                    { type: 'send_quick_reply', content: 'trial_expiring_options' }
                ],
                cooldown: 60, // 1 hour
                maxPerDay: 2
            },

            // Welcome message for new users
            {
                id: 'welcome_new_user',
                name: 'Welcome New User',
                priority: 90,
                conditions: [
                    { type: 'user_behavior', operator: 'equals', value: 'new' },
                    { type: 'chat_type', operator: 'equals', value: 'bot' }
                ],
                actions: [
                    { type: 'send_message', content: 'welcome_new_user_message' },
                    { type: 'send_quick_reply', content: 'welcome_new_user_options' }
                ],
                cooldown: 1440, // 24 hours
                maxPerDay: 1
            },

            // Payment reminder for expired users
            {
                id: 'payment_expired',
                name: 'Payment Expired',
                priority: 95,
                conditions: [
                    { type: 'user_status', operator: 'equals', value: 'expired' },
                    { type: 'flow_state', operator: 'not_equals', value: 'payment' },
                    { type: 'chat_type', operator: 'equals', value: 'bot' }
                ],
                actions: [
                    { type: 'send_message', content: 'payment_expired_message' },
                    { type: 'send_quick_reply', content: 'payment_expired_options' }
                ],
                cooldown: 30, // 30 minutes
                maxPerDay: 3
            },

            // Regular chat flow notifications
            {
                id: 'regular_chat_flow',
                name: 'Regular Chat Flow',
                priority: 50,
                conditions: [
                    { type: 'chat_type', operator: 'equals', value: 'regular' },
                    { type: 'user_behavior', operator: 'equals', value: 'active' }
                ],
                actions: [
                    { type: 'send_message', content: 'regular_chat_message' }
                ],
                cooldown: 5, // 5 minutes
                maxPerDay: 10
            }
        ]
    }

    private setupCleanup() {
        // Clean up old notification history every hour
        setInterval(() => {
            this.cleanupNotificationHistory()
        }, 60 * 60 * 1000)
    }

    private cleanupNotificationHistory() {
        const now = Date.now()
        const oneDayAgo = now - (24 * 60 * 60 * 1000)

        for (const [userId, history] of Array.from(this.userNotificationHistory.entries())) {
            const filteredHistory = history.filter((record: { timestamp: number; ruleId: string }) => record.timestamp > oneDayAgo)
            if (filteredHistory.length === 0) {
                this.userNotificationHistory.delete(userId)
            } else {
                this.userNotificationHistory.set(userId, filteredHistory)
            }
        }
    }

    public async shouldShowNotification(context: NotificationContext): Promise<boolean> {
        const applicableRules = await this.getApplicableRules(context)

        if (applicableRules.length === 0) {
            return false
        }

        // Check if we've exceeded daily limits
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        for (const rule of applicableRules) {
            const todayNotifications = this.getTodayNotificationCount(context.user.facebook_id, rule.id)

            if (rule.maxPerDay && todayNotifications >= rule.maxPerDay) {
                continue
            }

            // Check cooldown
            if (rule.cooldown) {
                const lastShown = this.getLastNotificationTime(context.user.facebook_id, rule.id)
                const cooldownMs = rule.cooldown * 60 * 1000

                if (lastShown && (Date.now() - lastShown) < cooldownMs) {
                    continue
                }
            }

            return true
        }

        return false
    }

    private async getApplicableRules(context: NotificationContext): Promise<NotificationRule[]> {
        const applicableRules: NotificationRule[] = []

        for (const rule of this.rules) {
            if (await this.evaluateConditions(rule.conditions, context)) {
                applicableRules.push(rule)
            }
        }

        // Sort by priority (highest first)
        return applicableRules.sort((a, b) => b.priority - a.priority)
    }

    private async evaluateConditions(conditions: NotificationCondition[], context: NotificationContext): Promise<boolean> {
        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, context)) {
                return false
            }
        }
        return true
    }

    private evaluateCondition(condition: NotificationCondition, context: NotificationContext): boolean {
        const { user, currentFlow, userBehavior, chatType } = context

        switch (condition.type) {
            case 'user_status':
                return this.evaluateOperator(user.status, condition.operator, condition.value)

            case 'trial_days':
                if (!isTrialUser(user.membership_expires_at)) {
                    return false
                }
                const daysLeft = daysUntilExpiry(user.membership_expires_at!)
                return this.evaluateOperator(daysLeft, condition.operator, condition.value)

            case 'flow_state':
                return this.evaluateOperator(currentFlow, condition.operator, condition.value)

            case 'user_behavior':
                return this.evaluateOperator(userBehavior, condition.operator, condition.value)

            case 'chat_type':
                return this.evaluateOperator(chatType, condition.operator, condition.value)

            case 'last_notification':
                const lastNotification = this.getLastNotificationTime(user.facebook_id)
                const timeDiff = lastNotification ? (Date.now() - lastNotification) / (1000 * 60) : 999999
                return this.evaluateOperator(timeDiff, condition.operator, condition.value)

            default:
                return false
        }
    }

    private evaluateOperator(actual: any, operator: string, expected: any): boolean {
        switch (operator) {
            case 'equals':
                return actual === expected
            case 'not_equals':
                return actual !== expected
            case 'greater_than':
                return Number(actual) > Number(expected)
            case 'less_than':
                return Number(actual) < Number(expected)
            case 'contains':
                return String(actual).includes(String(expected))
            case 'not_contains':
                return !String(actual).includes(String(expected))
            default:
                return false
        }
    }

    private getTodayNotificationCount(userId: string, ruleId?: string): number {
        const history = this.userNotificationHistory.get(userId) || []
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayTimestamp = todayStart.getTime()

        return history.filter(record =>
            record.timestamp >= todayTimestamp &&
            (!ruleId || record.ruleId === ruleId)
        ).length
    }

    private getLastNotificationTime(userId: string, ruleId?: string): number | null {
        const history = this.userNotificationHistory.get(userId) || []
        const relevantRecords = ruleId
            ? history.filter(record => record.ruleId === ruleId)
            : history

        if (relevantRecords.length === 0) {
            return null
        }

        return Math.max(...relevantRecords.map(record => record.timestamp))
    }

    public async showNotification(context: NotificationContext): Promise<void> {
        const applicableRules = await this.getApplicableRules(context)

        if (applicableRules.length === 0) {
            return
        }

        // Get the highest priority rule that hasn't exceeded limits
        const ruleToExecute = applicableRules.find(rule => {
            const todayCount = this.getTodayNotificationCount(context.user.facebook_id, rule.id)
            if (rule.maxPerDay && todayCount >= rule.maxPerDay) {
                return false
            }

            if (rule.cooldown) {
                const lastShown = this.getLastNotificationTime(context.user.facebook_id, rule.id)
                const cooldownMs = rule.cooldown * 60 * 1000
                if (lastShown && (Date.now() - lastShown) < cooldownMs) {
                    return false
                }
            }

            return true
        })

        if (!ruleToExecute) {
            return
        }

        // Execute the notification actions
        await this.executeActions(ruleToExecute.actions, context)

        // Record the notification
        this.recordNotification(context.user.facebook_id, ruleToExecute.id)
    }

    private async executeActions(actions: NotificationAction[], context: NotificationContext): Promise<void> {
        for (const action of actions) {
            switch (action.type) {
                case 'send_message':
                    await this.executeMessageAction(action, context)
                    break

                case 'send_quick_reply':
                    await this.executeQuickReplyAction(action, context)
                    break

                case 'send_typing':
                    await sendTypingIndicator(context.user.facebook_id)
                    break

                case 'delay':
                    if (action.delay) {
                        await new Promise(resolve => setTimeout(resolve, action.delay))
                    }
                    break
            }
        }
    }

    private async executeMessageAction(action: NotificationAction, context: NotificationContext): Promise<void> {
        if (typeof action.content === 'string') {
            if (action.content === 'trial_expiring_message') {
                await this.sendTrialExpiringMessage(context)
            } else if (action.content === 'welcome_new_user_message') {
                await this.sendWelcomeMessage(context)
            } else if (action.content === 'payment_expired_message') {
                await this.sendExpiredMessage(context)
            } else if (action.content === 'regular_chat_message') {
                await this.sendRegularChatMessage(context)
            } else {
                await sendMessage(context.user.facebook_id, action.content)
            }
        } else if (Array.isArray(action.content)) {
            await sendMessagesWithTyping(context.user.facebook_id, action.content)
        }
    }

    private async executeQuickReplyAction(action: NotificationAction, context: NotificationContext): Promise<void> {
        if (typeof action.content === 'string') {
            if (action.content === 'trial_expiring_options') {
                await this.sendTrialExpiringOptions(context)
            } else if (action.content === 'welcome_new_user_options') {
                await this.sendWelcomeOptions(context)
            } else if (action.content === 'payment_expired_options') {
                await this.sendExpiredOptions(context)
            }
        }
    }

    private async sendTrialExpiringMessage(context: NotificationContext): Promise<void> {
        const { user } = context
        const daysLeft = daysUntilExpiry(user.membership_expires_at!)

        if (daysLeft === 1) {
            await sendMessagesWithTyping(user.facebook_id, [
                '🚨 THÔNG BÁO QUAN TRỌNG',
                'Trial của bạn còn 24 giờ cuối cùng!',
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        } else {
            await sendMessagesWithTyping(user.facebook_id, [
                '⏰ THÔNG BÁO QUAN TRỌNG',
                `Trial của bạn còn ${daysLeft} ngày!`,
                '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
            ])
        }
    }

    private async sendTrialExpiringOptions(context: NotificationContext): Promise<void> {
        await sendQuickReply(
            context.user.facebook_id,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
                createQuickReply('⏰ NHẮC LẠI SAU', 'MAIN_MENU'),
                createQuickReply('ℹ️ TÌM HIỂU', 'INFO')
            ]
        )
    }

    private async sendWelcomeMessage(context: NotificationContext): Promise<void> {
        // DISABLED: Welcome message now handled by anti-spam system
        console.log('Welcome message handled by anti-spam system')
    }

    private async sendWelcomeOptions(context: NotificationContext): Promise<void> {
        await sendQuickReply(
            context.user.facebook_id,
            'Bạn muốn:',
            [
                createQuickReply('📝 ĐĂNG KÝ', 'REGISTER'),
                createQuickReply('ℹ️ TÌM HIỂU', 'INFO'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT')
            ]
        )
    }

    private async sendExpiredMessage(context: NotificationContext): Promise<void> {
        await sendMessagesWithTyping(context.user.facebook_id, [
            '⏰ TÀI KHOẢN ĐÃ HẾT HẠN!',
            'Tài khoản của bạn đã hết hạn sử dụng.',
            '💳 Phí duy trì: 2,000đ/ngày\n📅 Gói tối thiểu: 7 ngày = 14,000đ'
        ])
    }

    private async sendExpiredOptions(context: NotificationContext): Promise<void> {
        await sendQuickReply(
            context.user.facebook_id,
            'Gia hạn tài khoản:',
            [
                createQuickReply('💰 THANH TOÁN NGAY', 'PAYMENT'),
                createQuickReply('💬 LIÊN HỆ ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('❌ HỦY', 'MAIN_MENU')
            ]
        )
    }

    private async sendRegularChatMessage(context: NotificationContext): Promise<void> {
        // This would be customized based on the current chat context
        await sendMessage(context.user.facebook_id, '💬 Bạn cần hỗ trợ gì không?')
    }

    private recordNotification(userId: string, ruleId: string): void {
        const history = this.userNotificationHistory.get(userId) || []
        history.push({
            timestamp: Date.now(),
            ruleId: ruleId
        })

        // Keep only last 100 records per user
        if (history.length > 100) {
            history.splice(0, history.length - 100)
        }

        this.userNotificationHistory.set(userId, history)
    }

    public getNotificationStats(userId: string): { total: number, byRule: Record<string, number> } {
        const history = this.userNotificationHistory.get(userId) || []
        const byRule: Record<string, number> = {}

        for (const record of history) {
            byRule[record.ruleId] = (byRule[record.ruleId] || 0) + 1
        }

        return {
            total: history.length,
            byRule: byRule
        }
    }

    public clearNotificationHistory(userId: string): void {
        this.userNotificationHistory.delete(userId)
    }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance()
