import { supabaseAdmin } from './supabase'

// Spam detection configuration
const SPAM_CONFIG = {
    // Max messages per minute
    MAX_MESSAGES_PER_MINUTE: 10,
    // Max messages per hour
    MAX_MESSAGES_PER_HOUR: 50,
    // Max identical messages in a row
    MAX_IDENTICAL_MESSAGES: 3,
    // Cooldown period after spam detection (minutes)
    SPAM_COOLDOWN_MINUTES: 30,
    // Max consecutive identical messages before warning
    WARNING_THRESHOLD: 2
}

// In-memory store for rate limiting (in production, use Redis)
const userMessageCounts = new Map<string, { count: number, lastReset: number }>()
const userSpamWarnings = new Map<string, { count: number, lastWarning: number }>()
const userSpamBlocks = new Map<string, { blocked: boolean, blockTime: number }>()

// Check if user is spamming
export async function checkSpam(facebookId: string, message: string): Promise<{
    isSpam: boolean,
    reason?: string,
    shouldBlock: boolean,
    warningCount: number
}> {
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
            .from('messages')
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
export function isUserBlocked(facebookId: string): boolean {
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
}
