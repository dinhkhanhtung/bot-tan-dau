import { supabaseAdmin } from './supabase'

// Spam detection configuration - IMPROVED: More user-friendly limits
const SPAM_CONFIG = {
    // Max messages per minute (increased for better UX)
    MAX_MESSAGES_PER_MINUTE: 20,
    // Max messages per hour (increased for better UX)
    MAX_MESSAGES_PER_HOUR: 100,
    // Max identical messages in a row (reduced for better UX)
    MAX_IDENTICAL_MESSAGES: 2,
    // Cooldown period after spam detection (reduced for better UX)
    SPAM_COOLDOWN_MINUTES: 15,
    // Max consecutive identical messages before warning (reduced)
    WARNING_THRESHOLD: 1,
    // Max consecutive non-button messages before bot stops (significantly increased for better UX)
    MAX_NON_BUTTON_MESSAGES: 20,
    // Time window for non-button message tracking (increased)
    NON_BUTTON_WINDOW_MINUTES: 45,
    // Warning threshold for non-button messages (increased)
    NON_BUTTON_WARNING_THRESHOLD: 8
}

// In-memory store for rate limiting (in production, use Redis)
const userMessageCounts = new Map<string, { count: number, lastReset: number }>()
const userSpamWarnings = new Map<string, { count: number, lastWarning: number }>()
const userSpamBlocks = new Map<string, { blocked: boolean, blockTime: number }>()
const userNonButtonMessages = new Map<string, { count: number, lastMessage: number, messages: string[] }>()
const userBotStops = new Map<string, { stopped: boolean, stopTime: number, reason: string }>()

// Check if user is spamming
export async function checkSpam(facebookId: string, message: string): Promise<{
    isSpam: boolean,
    reason?: string,
    shouldBlock: boolean,
    warningCount: number
}> {
    // Check if user is admin - skip all spam checks for admin
    const { isAdmin } = await import('./handlers/admin-handlers')
    const userIsAdmin = await isAdmin(facebookId)

    if (userIsAdmin) {
        return {
            isSpam: false,
            shouldBlock: false,
            warningCount: 0
        }
    }

    // Check if user is in any active flow - skip spam checks for legitimate input
    const { getBotSession } = await import('./utils')
    const sessionData = await getBotSession(facebookId)
    const currentFlow = sessionData?.session_data?.current_flow

    if (currentFlow) {
        // Don't apply spam checks during active flows
        // as users need to type their information (registration, listing, search)
        return {
            isSpam: false,
            shouldBlock: false,
            warningCount: 0
        }
    }

    const now = Date.now()
    const minute = Math.floor(now / 60000) // Current minute
    const hour = Math.floor(now / 3600000) // Current hour

    // Check if user is currently blocked
    const blockInfo = userSpamBlocks.get(facebookId)
    if (blockInfo && blockInfo.blocked) {
        const blockDuration = now - blockInfo.blockTime
        if (blockDuration < SPAM_CONFIG.SPAM_COOLDOWN_MINUTES * 60 * 1000) {
            return {
                isSpam: true,
                reason: 'User is temporarily blocked for spam',
                shouldBlock: true,
                warningCount: 0
            }
        } else {
            // Unblock user after cooldown
            userSpamBlocks.delete(facebookId)
        }
    }

    // Get or create user message count
    let userCount = userMessageCounts.get(facebookId)
    if (!userCount || userCount.lastReset !== minute) {
        userCount = { count: 0, lastReset: minute }
        userMessageCounts.set(facebookId, userCount)
    }

    // Increment message count
    userCount.count++

    // Check rate limits
    if (userCount.count > SPAM_CONFIG.MAX_MESSAGES_PER_MINUTE) {
        await blockUser(facebookId, 'Exceeded message rate limit')
        return {
            isSpam: true,
            reason: 'Too many messages per minute',
            shouldBlock: true,
            warningCount: 0
        }
    }

    // Check for identical messages
    const identicalCount = await checkIdenticalMessages(facebookId, message)
    if (identicalCount >= SPAM_CONFIG.MAX_IDENTICAL_MESSAGES) {
        await blockUser(facebookId, 'Sending identical messages repeatedly')
        return {
            isSpam: true,
            reason: 'Sending identical messages repeatedly',
            shouldBlock: true,
            warningCount: 0
        }
    }

    // Check if user should get a warning
    if (identicalCount >= SPAM_CONFIG.WARNING_THRESHOLD) {
        const warningInfo = userSpamWarnings.get(facebookId)
        const warningCount = warningInfo ? warningInfo.count + 1 : 1

        userSpamWarnings.set(facebookId, {
            count: warningCount,
            lastWarning: now
        })

        return {
            isSpam: false,
            shouldBlock: false,
            warningCount
        }
    }

    return {
        isSpam: false,
        shouldBlock: false,
        warningCount: 0
    }
}

// Check for identical messages in recent history
async function checkIdenticalMessages(facebookId: string, message: string): Promise<number> {
    try {
        // Get recent messages from database
        const { data: recentMessages, error } = await supabaseAdmin
            .from('user_messages')
            .select('content')
            .eq('user_id', facebookId)
            .order('created_at', { ascending: false })
            .limit(5)

        if (error) {
            console.error('Error checking identical messages:', error)
            // Fallback: return 0 if table doesn't exist
            return 0
        }

        if (!recentMessages) return 0

        // Count identical messages
        let identicalCount = 0
        for (const msg of recentMessages) {
            if (msg.content === message) {
                identicalCount++
            } else {
                break // Stop counting when we hit a different message
            }
        }

        return identicalCount
    } catch (error) {
        console.error('Error in checkIdenticalMessages:', error)
        // Fallback: return 0 if any error
        return 0
    }
}

// Block user for spam
async function blockUser(facebookId: string, reason: string): Promise<void> {
    const now = Date.now()
    userSpamBlocks.set(facebookId, {
        blocked: true,
        blockTime: now
    })

    // Log spam attempt
    try {
        await supabaseAdmin
            .from('spam_logs')
            .insert({
                user_id: facebookId,
                reason: reason,
                blocked_at: new Date().toISOString(),
                action: 'blocked'
            })
    } catch (error) {
        console.error('Error logging spam:', error)
    }
}

// Send spam warning message
export async function sendSpamWarning(facebookId: string, warningCount: number): Promise<void> {
    const { sendMessage, sendQuickReply, createQuickReply } = await import('./facebook-api')

    if (warningCount === 1) {
        await sendMessage(facebookId, '⚠️ Cảnh báo: Bạn đang gửi tin nhắn giống nhau liên tục!')
        await sendMessage(facebookId, 'Vui lòng dừng lại để tránh bị tạm khóa bot.')
    } else if (warningCount === 2) {
        await sendMessage(facebookId, '🚨 Cảnh báo lần 2: Bạn đang spam tin nhắn!')
        await sendMessage(facebookId, 'Nếu tiếp tục, bot sẽ bị tạm khóa và bạn cần liên hệ admin.')
    }
}

// Send spam block message
export async function sendSpamBlockMessage(facebookId: string): Promise<void> {
    const { sendMessage, sendQuickReply, createQuickReply } = await import('./facebook-api')

    await sendMessage(facebookId, '🚫 BOT ĐÃ BỊ TẠM KHÓA DO SPAM!')
    await sendMessage(facebookId, 'Bạn đã gửi quá nhiều tin nhắn hoặc spam. Bot sẽ được mở khóa sau 30 phút.')
    await sendMessage(facebookId, 'Nếu cần hỗ trợ khẩn cấp, hãy liên hệ admin:')

    await sendQuickReply(
        facebookId,
        'Liên hệ admin:',
        [
            createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN'),
            createQuickReply('📞 GỌI ĐIỆN THOẠI', 'CALL_ADMIN'),
            createQuickReply('📧 GỬI EMAIL', 'EMAIL_ADMIN')
        ]
    )
}

// Check if user is currently blocked
export async function isUserBlocked(facebookId: string): Promise<boolean> {
    // Check if user is admin - never block admin
    try {
        const { isAdmin } = await import('./handlers/admin-handlers')
        const userIsAdmin = await isAdmin(facebookId)

        if (userIsAdmin) {
            return false
        }
    } catch (error) {
        console.error('Error checking admin status in isUserBlocked:', error)
    }

    // Check if user is in any active flow - don't block during legitimate flows
    try {
        const { getBotSession } = await import('./utils')
        const sessionData = await getBotSession(facebookId)

        // Handle both possible session data structures
        const currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow

        if (currentFlow) {
            // Don't block users during active flows as they need to type information
            return false
        }
    } catch (error) {
        console.error('Error checking session in isUserBlocked:', error)
    }

    const blockInfo = userSpamBlocks.get(facebookId)
    if (!blockInfo) return false

    const now = Date.now()
    const blockDuration = now - blockInfo.blockTime

    // Auto-unblock after cooldown period
    if (blockDuration >= SPAM_CONFIG.SPAM_COOLDOWN_MINUTES * 60 * 1000) {
        userSpamBlocks.delete(facebookId)
        return false
    }

    return blockInfo.blocked
}

// Get spam statistics for admin
export async function getSpamStats(): Promise<{
    totalBlocks: number,
    activeBlocks: number,
    recentSpam: any[]
}> {
    try {
        // Get total blocks from database
        const { count: totalBlocks } = await supabaseAdmin
            .from('spam_logs')
            .select('*', { count: 'exact', head: true })

        // Count active blocks
        const activeBlocks = userSpamBlocks.size

        // Get recent spam attempts
        const { data: recentSpam } = await supabaseAdmin
            .from('spam_logs')
            .select('*')
            .order('blocked_at', { ascending: false })
            .limit(10)

        return {
            totalBlocks: totalBlocks || 0,
            activeBlocks,
            recentSpam: recentSpam || []
        }
    } catch (error) {
        console.error('Error getting spam stats:', error)
        return {
            totalBlocks: 0,
            activeBlocks: 0,
            recentSpam: []
        }
    }
}

// Track non-button messages (when user sends text instead of clicking buttons)
export async function trackNonButtonMessage(facebookId: string, message: string): Promise<{
    shouldStopBot: boolean,
    warningCount: number,
    reason?: string
}> {
    // Check if user is admin - skip tracking for admin
    const { isAdmin } = await import('./handlers/admin-handlers')
    const userIsAdmin = await isAdmin(facebookId)

    if (userIsAdmin) {
        return {
            shouldStopBot: false,
            warningCount: 0
        }
    }

    // Check if user is in any active flow - skip tracking for legitimate input
    const { getBotSession } = await import('./utils')
    const sessionData = await getBotSession(facebookId)

    // Handle both possible session data structures
    const currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow

    console.log('Anti-spam check for user:', facebookId, 'Flow:', currentFlow, 'Session:', sessionData)

    if (currentFlow) {
        // Don't track non-button messages during active flows
        // as users need to type their information (registration, listing, search)
        console.log('Skipping anti-spam for user in flow:', currentFlow)
        return {
            shouldStopBot: false,
            warningCount: 0
        }
    }

    const now = Date.now()
    const windowMs = SPAM_CONFIG.NON_BUTTON_WINDOW_MINUTES * 60 * 1000

    // Check if user is already stopped
    const stopInfo = userBotStops.get(facebookId)
    if (stopInfo && stopInfo.stopped) {
        const stopDuration = now - stopInfo.stopTime
        if (stopDuration < SPAM_CONFIG.SPAM_COOLDOWN_MINUTES * 60 * 1000) {
            return {
                shouldStopBot: true,
                warningCount: 0,
                reason: stopInfo.reason
            }
        } else {
            // Auto-unstop after cooldown
            userBotStops.delete(facebookId)
        }
    }

    // Get or create non-button message tracking
    let nonButtonData = userNonButtonMessages.get(facebookId)
    if (!nonButtonData || (now - nonButtonData.lastMessage) > windowMs) {
        nonButtonData = { count: 0, lastMessage: now, messages: [] }
        userNonButtonMessages.set(facebookId, nonButtonData)
    }

    // Increment count and add message
    nonButtonData.count++
    nonButtonData.lastMessage = now
    nonButtonData.messages.push(message)

    // Keep only recent messages
    if (nonButtonData.messages.length > SPAM_CONFIG.MAX_NON_BUTTON_MESSAGES) {
        nonButtonData.messages.shift()
    }

    // Check if should stop bot
    if (nonButtonData.count >= SPAM_CONFIG.MAX_NON_BUTTON_MESSAGES) {
        await stopBotForUser(facebookId, 'User sent too many non-button messages')
        return {
            shouldStopBot: true,
            warningCount: nonButtonData.count,
            reason: 'User sent too many non-button messages'
        }
    }

    // Check if should warn (use the new threshold)
    if (nonButtonData.count >= SPAM_CONFIG.NON_BUTTON_WARNING_THRESHOLD) {
        return {
            shouldStopBot: false,
            warningCount: nonButtonData.count
        }
    }

    return {
        shouldStopBot: false,
        warningCount: 0
    }
}

// Stop bot for specific user
async function stopBotForUser(facebookId: string, reason: string): Promise<void> {
    const now = Date.now()
    userBotStops.set(facebookId, {
        stopped: true,
        stopTime: now,
        reason: reason
    })

    // Log bot stop
    try {
        await supabaseAdmin
            .from('spam_logs')
            .insert({
                user_id: facebookId,
                reason: reason,
                blocked_at: new Date().toISOString(),
                action: 'bot_stopped'
            })
    } catch (error) {
        console.error('Error logging bot stop:', error)
    }
}

// Check if bot is stopped for user
export async function isBotStoppedForUser(facebookId: string): Promise<boolean> {
    // Check if user is admin - never stop bot for admin
    try {
        const { isAdmin } = await import('./handlers/admin-handlers')
        const userIsAdmin = await isAdmin(facebookId)

        if (userIsAdmin) {
            return false
        }
    } catch (error) {
        console.error('Error checking admin status in isBotStoppedForUser:', error)
    }

    // Check if user is in any active flow - don't stop bot during legitimate flows
    try {
        const { getBotSession } = await import('./utils')
        const sessionData = await getBotSession(facebookId)

        // Handle both possible session data structures
        const currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow

        if (currentFlow) {
            // Don't stop bot during active flows as users need to type information
            return false
        }
    } catch (error) {
        console.error('Error checking session in isBotStoppedForUser:', error)
    }

    const stopInfo = userBotStops.get(facebookId)
    if (!stopInfo) return false

    const now = Date.now()
    const stopDuration = now - stopInfo.stopTime

    // Auto-unstop after cooldown period
    if (stopDuration >= SPAM_CONFIG.SPAM_COOLDOWN_MINUTES * 60 * 1000) {
        userBotStops.delete(facebookId)
        return false
    }

    return stopInfo.stopped
}

// Reset non-button message tracking (call when user clicks a button)
export function resetNonButtonTracking(facebookId: string): void {
    userNonButtonMessages.delete(facebookId)
}

// Send bot stopped message
export async function sendBotStoppedMessage(facebookId: string, reason: string): Promise<void> {
    const { sendMessage, sendQuickReply, createQuickReply } = await import('./facebook-api')

    await sendMessage(facebookId, '🚫 BOT ĐÃ TẠM DỪNG!')
    await sendMessage(facebookId, 'Bạn đã gửi quá nhiều tin nhắn mà không chọn nút. Bot sẽ tạm dừng để tránh spam.')
    await sendMessage(facebookId, 'Nếu cần hỗ trợ, hãy liên hệ admin:')

    await sendQuickReply(
        facebookId,
        'Liên hệ admin:',
        [
            createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN'),
            createQuickReply('🔄 THỬ LẠI SAU', 'MAIN_MENU'),
            createQuickReply('ℹ️ THÔNG TIN', 'INFO')
        ]
    )
}

// Send non-button warning message
export async function sendNonButtonWarning(facebookId: string, warningCount: number): Promise<void> {
    const { sendMessage, sendQuickReply, createQuickReply } = await import('./facebook-api')

    if (warningCount === 1) {
        await sendMessage(facebookId, '⚠️ Cảnh báo: Bạn đang gửi tin nhắn thay vì chọn nút!')
        await sendMessage(facebookId, 'Vui lòng sử dụng các nút bên dưới để tương tác với bot.')
    } else if (warningCount === 2) {
        await sendMessage(facebookId, '🚨 Cảnh báo lần 2: Bạn vẫn chưa chọn nút!')
        await sendMessage(facebookId, 'Nếu tiếp tục gửi tin nhắn, bot sẽ tạm dừng và bạn cần liên hệ admin.')
    }
}

// Clean up old data (call this periodically)
export function cleanupSpamData(): void {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)

    // Clean up old message counts
    Array.from(userMessageCounts.keys()).forEach(facebookId => {
        const data = userMessageCounts.get(facebookId)
        if (data && data.lastReset < oneHourAgo) {
            userMessageCounts.delete(facebookId)
        }
    })

    // Clean up old warnings
    Array.from(userSpamWarnings.keys()).forEach(facebookId => {
        const data = userSpamWarnings.get(facebookId)
        if (data && data.lastWarning < oneHourAgo) {
            userSpamWarnings.delete(facebookId)
        }
    })

    // Clean up old non-button tracking
    Array.from(userNonButtonMessages.keys()).forEach(facebookId => {
        const data = userNonButtonMessages.get(facebookId)
        if (data && (now - data.lastMessage) > oneHourAgo) {
            userNonButtonMessages.delete(facebookId)
        }
    })

    // Clean up old bot stops
    Array.from(userBotStops.keys()).forEach(facebookId => {
        const data = userBotStops.get(facebookId)
        if (data && (now - data.stopTime) > oneHourAgo) {
            userBotStops.delete(facebookId)
        }
    })
}
