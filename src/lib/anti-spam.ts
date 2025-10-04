import { supabaseAdmin } from './supabase'

/**
 * Check if user is registered based on status
 */
export function isRegistered(userStatus: string): boolean {
    return userStatus === 'registered' || userStatus === 'trial' || userStatus === 'active';
}

/**
 * Send welcome message when user clicks "Chat Bot" button
 * @deprecated Welcome message logic moved to welcome-service.ts
 */
export async function sendChatBotWelcome(userId: string, userStatus: string): Promise<void> {
    const { sendQuickReply, createQuickReply } = await import('./facebook-api');

    if (isRegistered(userStatus)) {
        // User đã đăng ký - hiển thị menu chính
        await sendQuickReply(
            userId,
            '🤖 BOT MODE ACTIVATED\nChọn chức năng:',
            [
                createQuickReply('🛒 TÌM KIẾM HÀNG HÓA', 'SEARCH'),
                createQuickReply('📝 ĐĂNG BÁN/CẬP NHẬT', 'LISTING'),
                createQuickReply('💬 HỖ TRỢ ADMIN', 'SUPPORT_ADMIN'),
                createQuickReply('ℹ️ HƯỚNG DẪN', 'HELP'),
                createQuickReply('🚪 THOÁT BOT', 'EXIT_BOT')
            ]
        );
    } else {
        // User chưa đăng ký - hiển thị thông tin cộng đồng
        const { sendMessage } = await import('./facebook-api');

        await sendMessage(userId, '🌟 Có thể bạn muốn tham gia cùng cộng đồng Tân Dậu - Hỗ Trợ Chéo!')
        await sendMessage(userId, '🤝 Nơi đây chúng ta có thể cùng nhau kết nối - Cùng nhau thịnh vượng!')

        await sendQuickReply(
            userId,
            'Bạn muốn:',
            [
                createQuickReply('🚀 ĐĂNG KÝ THÀNH VIÊN', 'REGISTER'),
                createQuickReply('ℹ️ TÌM HIỂU THÊM', 'INFO'),
                createQuickReply('💬 HỖ TRỢ', 'SUPPORT'),
                createQuickReply('🚪 THOÁT BOT', 'EXIT_BOT')
            ]
        );
    }
}

// Spam detection configuration
const SPAM_CONFIG = {
    // User chưa đăng ký (xử lý nhẹ nhàng)
    UNREGISTERED: {
        RESET_TIME_MINUTES: 2,
        WARNING_LEVELS: {
            1: '💡 Hãy chọn một trong các nút bên dưới để tiếp tục',
            2: '💡 Hãy chọn một trong các nút bên dưới để tiếp tục',
            3: '⚠️ Bạn đã gửi tin nhắn nhiều lần. Vui lòng đăng ký để sử dụng đầy đủ tính năng!',
            4: '🚫 Bạn đã bị tạm khóa 30 phút do gửi quá nhiều tin nhắn'
        },
        LOCK_TIME_MINUTES: 30
    },
    // User đã đăng ký (phân cấp theo ngữ cảnh)
    REGISTERED: {
        SEARCH_LISTING: {
            TIME_WINDOW_SECONDS: 30,
            MAX_MESSAGES: 5,
            WARNING_AT: 3,
            LOCK_TIME_MINUTES: 30
        },
        ADMIN_SUPPORT: {
            TIME_WINDOW_MINUTES: 1,
            MAX_MESSAGES: 5,
            WARNING_AT: 3,
            LOCK_TIME_HOURS: 2
        }
    },
    // Các cấu hình cũ (để tương thích ngược)
    SPAM_COOLDOWN_MINUTES: 15,
    MAX_MESSAGES_PER_MINUTE: 20,
    MAX_MESSAGES_PER_HOUR: 100,
    MAX_MESSAGES_PER_MINUTE_NEW: 3,
    MAX_MESSAGES_PER_HOUR_NEW: 10,
    MAX_IDENTICAL_MESSAGES: 2,
    WARNING_THRESHOLD: 1,
    MAX_NON_BUTTON_MESSAGES: 20,
    MAX_NON_BUTTON_MESSAGES_NEW: 5,
    NON_BUTTON_WINDOW_MINUTES: 45,
    NON_BUTTON_WARNING_THRESHOLD: 8,
    NON_BUTTON_WARNING_THRESHOLD_NEW: 3
}

// In-memory store for rate limiting (in production, use Redis)
const userMessageCounts = new Map<string, { count: number, lastReset: number }>()
const userSpamWarnings = new Map<string, { count: number, lastWarning: number }>()
const userSpamBlocks = new Map<string, { blocked: boolean, blockTime: number }>()
const userNonButtonMessages = new Map<string, { count: number, lastMessage: number, messages: string[] }>()
const userBotStops = new Map<string, { stopped: boolean, stopTime: number, reason: string }>()

// Bot mode tracking - user chỉ được coi là trong bot khi đã ấn nút "Chat Bot"
const userBotMode = new Map<string, { inBot: boolean, enteredAt: number }>()

// Tracking số lần hiển thị nút Chat Bot cho mỗi user
// NOTE: Trong production (Vercel), Map có thể bị reset giữa các request
// Giải pháp tạm thời: Lưu vào Supabase để persistent
const userChatBotOfferCount = new Map<string, { count: number, lastOffer: number }>()

// Hàm kiểm tra user có trong bot mode không
export async function checkUserBotMode(facebookId: string): Promise<boolean> {
    try {
        // Kiểm tra từ database thay vì Map
        const { supabaseAdmin } = await import('./supabase')
        const { data } = await supabaseAdmin
            .from('user_bot_modes')
            .select('*')
            .eq('facebook_id', facebookId)
            .eq('in_bot', true)
            .single()

        if (!data) return false

        // Auto-exit bot mode sau 24 giờ
        const now = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000
        const enteredAt = new Date(data.entered_at).getTime()

        if (now - enteredAt > twentyFourHours) {
            // Xóa bot mode cũ
            await supabaseAdmin
                .from('user_bot_modes')
                .delete()
                .eq('facebook_id', facebookId)
            return false
        }

        return true
    } catch (error) {
        console.error('Error checking bot mode:', error)
        return false
    }
}

// Hàm đặt user vào bot mode (khi ấn nút "Chat Bot")
export async function setUserBotMode(facebookId: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('./supabase')
        await supabaseAdmin
            .from('user_bot_modes')
            .upsert({
                facebook_id: facebookId,
                in_bot: true,
                entered_at: new Date().toISOString()
            })
        console.log('✅ User entered bot mode:', facebookId)
    } catch (error) {
        console.error('Error setting bot mode:', error)
    }
}

// Hàm đưa user ra khỏi bot mode (khi ấn nút "Thoát Bot")
export async function exitUserBotMode(facebookId: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('./supabase')
        await supabaseAdmin
            .from('user_bot_modes')
            .delete()
            .eq('facebook_id', facebookId)
        console.log('🚪 User exited bot mode:', facebookId)
    } catch (error) {
        console.error('Error exiting bot mode:', error)
    }
}

// Hàm kiểm tra và tăng số lần hiển thị nút Chat Bot - LOGIC MỚI với biến môi trường
export async function shouldShowChatBotButton(facebookId: string): Promise<boolean> {
    const { supabaseAdmin } = await import('./supabase')
    const now = Date.now()

    // Lấy cấu hình từ biến môi trường
    const RESET_HOURS = parseInt(process.env.CHAT_BOT_COUNTER_RESET_HOURS || '24')
    const MAX_DISPLAYS = parseInt(process.env.CHAT_BOT_COUNTER_MAX_DISPLAYS || '3')
    const WELCOME_FULL_DISPLAYS = parseInt(process.env.CHAT_BOT_WELCOME_FULL_DISPLAYS || '1')

    // Lấy dữ liệu từ database
    const { data: offerData } = await supabaseAdmin
        .from('chat_bot_offer_counts')
        .select('*')
        .eq('facebook_id', facebookId)
        .single()

    // Nếu không có dữ liệu, đây là lần đầu tiên - hiển thị nút
    if (!offerData) {
        return true
    }

    // Kiểm tra thời gian reset để cho phép gửi tin chào mừng đầy đủ lần nữa
    const resetTimeMs = RESET_HOURS * 60 * 60 * 1000
    if ((now - new Date(offerData.last_offer).getTime()) > resetTimeMs) {
        // Reset counter để cho phép gửi tin chào mừng đầy đủ lần nữa
        await supabaseAdmin
            .from('chat_bot_offer_counts')
            .update({
                count: 0,
                last_offer: new Date(now).toISOString()
            })
            .eq('facebook_id', facebookId)
        return true
    }

    // Nếu count < WELCOME_FULL_DISPLAYS, đây là lần hiển thị tin chào mừng đầy đủ
    if (offerData.count < WELCOME_FULL_DISPLAYS) {
        return true
    }

    // Nếu count >= WELCOME_FULL_DISPLAYS và < MAX_DISPLAYS, chỉ hiển thị nút mà không nói gì
    if (offerData.count >= WELCOME_FULL_DISPLAYS && offerData.count < MAX_DISPLAYS) {
        return true
    }

    // Nếu count >= MAX_DISPLAYS, tạm dừng hiển thị nút
    return false
}

// Hàm tăng counter cho tin nhắn thường - LƯU VÀO DATABASE
export async function incrementNormalMessageCount(facebookId: string): Promise<void> {
    const now = Date.now()

    // Lấy counter từ database
    const { supabaseAdmin } = await import('./supabase')
    const { data: existingData } = await supabaseAdmin
        .from('chat_bot_offer_counts')
        .select('*')
        .eq('facebook_id', facebookId)
        .single()

    console.log(`🔢 incrementNormalMessageCount for ${facebookId}:`, {
        before: existingData,
        timestamp: now
    })

    if (!existingData) {
        // Tạo mới
        await supabaseAdmin
            .from('chat_bot_offer_counts')
            .insert({
                facebook_id: facebookId,
                count: 1,
                last_offer: new Date(now).toISOString()
            })
        console.log(`✅ Created new counter for ${facebookId}: count=1`)
    } else {
        // Tăng counter
        await supabaseAdmin
            .from('chat_bot_offer_counts')
            .update({
                count: existingData.count + 1,
                last_offer: new Date(now).toISOString()
            })
            .eq('facebook_id', facebookId)
        console.log(`✅ Incremented counter for ${facebookId}: count=${existingData.count + 1}`)
    }
}

// Hàm lấy thông tin counter - LẤY TỪ DATABASE
export async function getUserChatBotOfferCount(facebookId: string): Promise<{ count: number, lastOffer: number } | undefined> {
    const { supabaseAdmin } = await import('./supabase')
    const { data } = await supabaseAdmin
        .from('chat_bot_offer_counts')
        .select('*')
        .eq('facebook_id', facebookId)
        .single()

    if (!data) return undefined

    return {
        count: data.count,
        lastOffer: new Date(data.last_offer).getTime()
    }
}

// Hàm kiểm tra bot có nên dừng hoàn toàn không (DEPRECATED - không dùng nữa)
export function shouldBotStopCompletely(facebookId: string): boolean {
    const offerData = userChatBotOfferCount.get(facebookId)
    const now = Date.now()

    // Reset sau 24 giờ
    if (offerData && (now - offerData.lastOffer) > 24 * 60 * 60 * 1000) {
        userChatBotOfferCount.delete(facebookId)
        return false
    }

    // Dừng hoàn toàn sau tin nhắn thứ 3 (count >= 3)
    if (offerData && offerData.count >= 3) {
        return true
    }

    return false
}


// Hàm xử lý thoát bot với đếm ngược thời gian
export async function handleBotExit(facebookId: string): Promise<void> {
    const { sendMessage, sendQuickReply, createQuickReply } = await import('./facebook-api')

    // Đưa user ra khỏi bot mode
    await exitUserBotMode(facebookId)

    // Gửi tin nhắn xác nhận thoát bot
    await sendMessage(facebookId, '🚪 Bạn đã thoát khỏi Bot Mode!')
    await sendMessage(facebookId, '💬 Bây giờ bạn có thể chat bình thường với admin.')
    await sendMessage(facebookId, '🤖 Nếu muốn sử dụng Bot Tân Dậu - Hỗ Trợ Chéo, hãy ấn nút "Chat Bot" bên dưới.')

    // Gửi nút để quay lại bot
    await sendQuickReply(
        facebookId,
        'Chọn hành động:',
        [
            createQuickReply('🤖 CHAT BOT', 'CHAT_BOT')
        ]
    )
}

// Hàm reset counter khi admin kết thúc chat - cho phép user chat lại bình thường
export async function resetWelcomeCounter(facebookId: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('./supabase')

        // Xóa counter hiện tại để reset về 0
        const { error } = await supabaseAdmin
            .from('chat_bot_offer_counts')
            .delete()
            .eq('facebook_id', facebookId)

        if (error) {
            console.error('Error resetting welcome counter:', error)
        } else {
            console.log(`✅ Reset welcome counter for ${facebookId}`)
        }
    } catch (error) {
        console.error('Error in resetWelcomeCounter:', error)
    }
}

// Hàm tạm dừng counter khi admin vào chat - không tăng counter trong thời gian admin chat
export async function pauseWelcomeCounter(facebookId: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('./supabase')

        // Đánh dấu user đang trong admin chat để tạm dừng counter
        await supabaseAdmin
            .from('user_bot_modes')
            .upsert({
                facebook_id: facebookId,
                in_bot: false,
                entered_at: new Date().toISOString(),
                paused_for_admin: true
            })

        console.log(`⏸️ Paused welcome counter for ${facebookId} - admin chat active`)
    } catch (error) {
        console.error('Error pausing welcome counter:', error)
    }
}

// Hàm kiểm tra user có đang trong admin chat không
export async function isUserInAdminChat(facebookId: string): Promise<boolean> {
    try {
        const { supabaseAdmin } = await import('./supabase')
        const { data } = await supabaseAdmin
            .from('user_bot_modes')
            .select('paused_for_admin')
            .eq('facebook_id', facebookId)
            .eq('paused_for_admin', true)
            .single()

        return !!data
    } catch (error) {
        console.error('Error checking admin chat status:', error)
        return false
    }
}

// Hàm chống spam THÔNG MINH chính - thay thế checkSpam cũ
export async function handleAntiSpam(facebookId: string, message: string, userStatus: string, currentFlow: string | null = null): Promise<{
    action: 'none' | 'warning' | 'block',
    block: boolean,
    unlockTime?: number,
    message?: string
}> {
    // Check if user is admin - skip all spam checks for admin
    const { isAdmin } = await import('./utils')
    const userIsAdmin = await isAdmin(facebookId)

    if (userIsAdmin) {
        return { action: 'none', block: false }
    }

    // QUAN TRỌNG: Kiểm tra user có đang trong bot mode không
    const isInBotMode = await checkUserBotMode(facebookId)
    if (!isInBotMode) {
        console.log('🚫 User not in bot mode - skipping anti-spam check')
        return { action: 'none', block: false }
    }

    // QUAN TRỌNG: Nếu đang trong flow hợp lệ, KHÔNG áp dụng chống spam
    // Vì user đang nhập thông tin cần thiết cho việc đăng ký/niêm yết/tìm kiếm
    if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
        console.log('🔄 User đang trong flow:', currentFlow, '- KHÔNG áp dụng chống spam')
        return { action: 'none', block: false }
    }

    // ĐẶC BIỆT: User chưa đăng ký đang trong flow đăng ký - cho phép gửi tin nhắn
    if (!isRegistered(userStatus) && currentFlow === 'registration') {
        console.log('🔄 Unregistered user in registration flow - allowing messages')
        return { action: 'none', block: false }
    }

    // Kiểm tra trạng thái khóa hiện tại (chỉ khi không trong flow)
    if (await isUserLocked(facebookId)) {
        return { action: 'block', block: true }
    }

    // Xử lý theo loại user (chỉ khi không trong flow)
    if (!isRegistered(userStatus)) {
        return await handleUnregisteredSpam(facebookId, message, userStatus)
    } else {
        return await handleRegisteredSpam(facebookId, message, userStatus, currentFlow)
    }
}

// Xử lý spam cho user chưa đăng ký (nhẹ nhàng)
async function handleUnregisteredSpam(facebookId: string, message: string, userStatus: string): Promise<{
    action: 'none' | 'warning' | 'block',
    block: boolean,
    unlockTime?: number,
    message?: string
}> {
    const { sendMessage } = await import('./facebook-api')
    const now = Date.now()
    const resetTime = SPAM_CONFIG.UNREGISTERED.RESET_TIME_MINUTES * 60 * 1000

    console.log('🔍 Checking spam for unregistered user:', facebookId, 'Status:', userStatus)

    // Lấy dữ liệu spam từ database
    const { data: spamData, error } = await supabaseAdmin
        .from('spam_tracking')
        .select('*')
        .eq('user_id', facebookId)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error fetching spam data:', error)
    }

    console.log('📊 Current spam data:', spamData)

    // Reset count nếu quá thời gian
    if (spamData && spamData.last_message_time && (now - spamData.last_message_time) > resetTime) {
        console.log('🔄 Resetting spam count - time exceeded reset time')
        await updateSpamData(facebookId, { message_count: 0, warning_count: 0 })
    }

    // Cập nhật count
    const currentCount = spamData?.message_count || 0
    const newCount = currentCount + 1

    console.log('📈 Spam count:', currentCount, '->', newCount)

    await updateSpamData(facebookId, {
        message_count: newCount,
        last_message_time: new Date(now).toISOString()
    })

    // Xử lý theo level - LOGIC MỚI THEO YÊU CẦU
    if (newCount === 1) {
        // Lần 1: Gửi welcome đầy đủ - SỬ DỤNG WELCOME SERVICE
        console.log('🎉 First message - sending welcome')
        const { welcomeService, WelcomeType } = await import('./welcome-service')
        const welcomeType = isRegistered(userStatus) ? WelcomeType.RETURNING_USER : WelcomeType.NEW_USER
        await welcomeService.sendWelcome(facebookId, welcomeType)
        return { action: 'none', block: false, message: 'Welcome sent' }
    } else if (newCount >= 2) {
        // Lần 2+: Chỉ cảnh báo nhẹ, KHÔNG khóa user chưa đăng ký
        console.log('⚠️ Message count >= 2 - sending gentle warning')
        await sendMessage(facebookId, '💡 Bạn có thể chọn một trong các nút bên dưới để tiếp tục!')
        return { action: 'warning', block: false, message: 'Gentle warning sent' }
    }

    return { action: 'none', block: false }
}

// Xử lý spam cho user đã đăng ký (phân cấp theo ngữ cảnh)
async function handleRegisteredSpam(facebookId: string, message: string, userStatus: string, currentFlow: string | null): Promise<{
    action: 'none' | 'warning' | 'block',
    block: boolean,
    unlockTime?: number,
    message?: string
}> {
    const { sendMessage } = await import('./facebook-api')
    const now = Date.now()

    // Lấy dữ liệu spam từ database
    const { data: spamData } = await supabaseAdmin
        .from('spam_tracking')
        .select('*')
        .eq('user_id', facebookId)
        .single()

    // Nếu đang trong luồng tìm kiếm/đăng bán
    if (currentFlow === 'search' || currentFlow === 'listing') {
        const config = SPAM_CONFIG.REGISTERED.SEARCH_LISTING
        const timeWindow = config.TIME_WINDOW_SECONDS * 1000

        if (spamData && (now - spamData.last_message_time) > timeWindow) {
            await updateSpamData(facebookId, { message_count: 1, last_message_time: new Date(now).toISOString() })
            return { action: 'none', block: false }
        }

        const newCount = (spamData?.message_count || 0) + 1
        await updateSpamData(facebookId, {
            message_count: newCount,
            last_message_time: new Date(now).toISOString()
        })

        if (newCount >= config.MAX_MESSAGES) {
            const lockTime = now + (config.LOCK_TIME_MINUTES * 60 * 1000)
            await updateSpamData(facebookId, { locked_until: lockTime })
            await sendMessage(facebookId, '🚫 Chức năng hiện tại đã bị khóa 30 phút do gửi quá nhiều tin nhắn')
            return { action: 'block', block: true, unlockTime: lockTime }
        } else if (newCount >= config.WARNING_AT) {
            await sendMessage(facebookId, '⚠️ Bạn đang gửi tin nhắn khá nhanh. Vui lòng chậm lại!')
            return { action: 'warning', block: false }
        }
    }

    // Nếu đang trong luồng hỗ trợ admin
    else if (currentFlow === 'admin_support') {
        const config = SPAM_CONFIG.REGISTERED.ADMIN_SUPPORT
        const timeWindow = config.TIME_WINDOW_MINUTES * 60 * 1000

        if (spamData && (now - spamData.last_message_time) > timeWindow) {
            await updateSpamData(facebookId, { message_count: 1, last_message_time: new Date(now).toISOString() })
            return { action: 'none', block: false }
        }

        const newCount = (spamData?.message_count || 0) + 1
        await updateSpamData(facebookId, {
            message_count: newCount,
            last_message_time: new Date(now).toISOString()
        })

        if (newCount >= config.MAX_MESSAGES) {
            const lockTime = now + (config.LOCK_TIME_HOURS * 60 * 60 * 1000)
            await updateSpamData(facebookId, { locked_until: lockTime })
            await sendMessage(facebookId, '🚫 Luồng hỗ trợ đã bị khóa 2 giờ. Vui lòng liên hệ admin trực tiếp!')
            return { action: 'block', block: true, unlockTime: lockTime }
        } else if (newCount >= config.WARNING_AT) {
            await sendMessage(facebookId, '⚠️ Bạn đang chat khá nhanh. Vui lòng chậm lại để admin trả lời!')
            return { action: 'warning', block: false }
        }
    }

    // Tin nhắn thường - không áp dụng chống spam nghiêm ngặt
    await updateSpamData(facebookId, { last_message_time: new Date(now).toISOString() })
    return { action: 'none', block: false }
}

// Hàm cập nhật dữ liệu spam vào database
async function updateSpamData(userId: string, updates: any): Promise<void> {
    try {
        console.log('🔄 Updating spam data for user:', userId, 'Updates:', updates)

        const result = await supabaseAdmin
            .from('spam_tracking')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })

        if (result.error) {
            console.error('❌ Error updating spam data:', result.error)
        } else {
            console.log('✅ Spam data updated successfully for user:', userId)
        }
    } catch (error) {
        console.error('❌ Error updating spam data:', error)
    }
}

// Kiểm tra user có bị khóa không
async function isUserLocked(facebookId: string): Promise<boolean> {
    try {
        const { data: spamData } = await supabaseAdmin
            .from('spam_tracking')
            .select('locked_until')
            .eq('user_id', facebookId)
            .single()

        if (spamData?.locked_until) {
            const lockTime = new Date(spamData.locked_until).getTime()
            const now = Date.now()
            return now < lockTime
        }

        return false
    } catch (error) {
        return false
    }
}

// Check if user is spamming (HÀM CŨ - ĐÃ LOẠI BỎ ĐỂ TRÁNH XUNG ĐỘT)
// Sử dụng handleAntiSpam() thay thế

// Check if user exists in database
async function checkIfUserExists(facebookId: string): Promise<boolean> {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('facebook_id', facebookId)
            .single()

        return !error && !!data
    } catch {
        return false
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
    await sendMessage(facebookId, 'Trong thời gian này, bạn có thể:')

    await sendQuickReply(
        facebookId,
        'Chọn hành động:',
        [
            createQuickReply('🔄 THOÁT BOT (Chat thường)', 'EXIT_BOT'),
            createQuickReply('💬 CHAT VỚI ADMIN', 'CONTACT_ADMIN'),
            createQuickReply('⏰ ĐỢI 30 PHÚT', 'WAIT_30_MIN')
        ]
    )
}

// Check if user is currently blocked
export async function isUserBlocked(facebookId: string): Promise<boolean> {
    // Check if user is admin - never block admin
    try {
        const { isAdmin } = await import('./utils')
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
        const currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow || null

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
    const { isAdmin } = await import('./utils')
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

    // Check if user is in admin chat mode - skip tracking
    const { isUserInAdminChat } = await import('./admin-chat')
    const isInAdminChat = await isUserInAdminChat(facebookId)

    if (isInAdminChat) {
        console.log('Skipping anti-spam for user in admin chat:', facebookId)
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

    // Check if user exists to apply different limits
    const isNewUser = !await checkIfUserExists(facebookId)
    const maxNonButtonMessages = isNewUser ? SPAM_CONFIG.MAX_NON_BUTTON_MESSAGES_NEW : SPAM_CONFIG.MAX_NON_BUTTON_MESSAGES
    const warningThreshold = isNewUser ? SPAM_CONFIG.NON_BUTTON_WARNING_THRESHOLD_NEW : SPAM_CONFIG.NON_BUTTON_WARNING_THRESHOLD

    // Check if should stop bot với giới hạn phù hợp cho loại user
    if (nonButtonData.count >= maxNonButtonMessages) {
        await stopBotForUser(facebookId, `User sent too many non-button messages (${nonButtonData.count}/${maxNonButtonMessages})`)
        return {
            shouldStopBot: true,
            warningCount: nonButtonData.count,
            reason: `User sent too many non-button messages (${nonButtonData.count})`
        }
    }

    // Check if should warn với ngưỡng phù hợp cho loại user
    if (nonButtonData.count >= warningThreshold) {
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
        const { isAdmin } = await import('./utils')
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
        const currentFlow = sessionData?.session_data?.current_flow || sessionData?.current_flow || null

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
