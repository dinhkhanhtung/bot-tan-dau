import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount)
}

// Format number with thousand separators
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('vi-VN').format(num)
}

// Generate referral code
export function generateReferralCode(userId: string): string {
    return `TD1981-${userId.slice(-6).toUpperCase()}`
}

// Calculate user level
export function calculateUserLevel(points: number): string {
    if (points >= 1000) return 'Bạch kim'
    if (points >= 500) return 'Vàng'
    if (points >= 200) return 'Bạc'
    return 'Đồng'
}

// Calculate days until expiry
export function daysUntilExpiry(expiryDate: string): number {
    try {
        const now = new Date()
        const expiry = new Date(expiryDate)

        // Ensure both dates are valid
        if (isNaN(expiry.getTime()) || isNaN(now.getTime())) {
            console.error('Invalid date format:', { expiryDate, now: now.toISOString() })
            return 0
        }

        // Calculate difference in milliseconds
        const diffTime = expiry.getTime() - now.getTime()

        // Convert to days and round up
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Ensure we don't return negative days for expired accounts
        return Math.max(diffDays, 0)
    } catch (error) {
        console.error('Error calculating days until expiry:', error)
        return 0
    }
}

// Check if user is in trial
export function isTrialUser(expiryDate: string | null): boolean {
    if (!expiryDate) return true
    return daysUntilExpiry(expiryDate) > 0
}

// Check if user is expired
export function isExpiredUser(expiryDate: string | null): boolean {
    if (!expiryDate) return false
    return daysUntilExpiry(expiryDate) <= 0
}

// Enhanced user status checking with smart logic
export function getUserStatusInfo(user: any) {
    const now = new Date()
    const expiryDate = user?.membership_expires_at ? new Date(user.membership_expires_at) : null
    const daysLeft = expiryDate ? daysUntilExpiry(expiryDate.toISOString()) : 0

    // Determine user category
    let category = 'guest'
    let canUseBot = false
    let needsTrialNotification = false
    let notificationPriority = 'low'

    if (!user) {
        category = 'guest'
        canUseBot = false
        needsTrialNotification = false
    } else if (user.status === 'trial' && daysLeft > 0) {
        category = 'trial'
        canUseBot = true
        // Only notify if trial is ending soon (within 3 days)
        needsTrialNotification = daysLeft <= 3
        notificationPriority = daysLeft <= 1 ? 'high' : 'medium'
    } else if (user.status === 'active') {
        category = 'active'
        canUseBot = true
        needsTrialNotification = false
    } else if (user.status === 'pending') {
        category = 'pending'
        canUseBot = true // ← THAY ĐỔI: Pending user có thể sử dụng bot
        needsTrialNotification = false
    } else if (user.status === 'expired' || daysLeft <= 0) {
        category = 'expired'
        canUseBot = false
        needsTrialNotification = false
    } else if (user.status === 'suspended') {
        category = 'suspended'
        canUseBot = false
        needsTrialNotification = false
    } else {
        // Default to guest for unknown status
        category = 'guest'
        canUseBot = false
        needsTrialNotification = false
    }

    return {
        category,
        canUseBot,
        needsTrialNotification,
        notificationPriority,
        daysLeft,
        expiryDate: expiryDate?.toISOString(),
        isAdmin: user?.is_admin || false
    }
}

// Check if user should receive trial notification (with frequency limiting)
export async function shouldSendTrialNotification(facebookId: string, userInfo: any): Promise<boolean> {
    if (!userInfo.needsTrialNotification) return false

    try {
        const { supabaseAdmin } = await import('./supabase')

        // Check last notification time
        const { data: lastNotification } = await supabaseAdmin
            .from('notifications')
            .select('created_at')
            .eq('user_id', facebookId)
            .eq('type', 'trial_reminder')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (lastNotification) {
            const lastNotificationTime = new Date(lastNotification.created_at)
            const now = new Date()
            const hoursSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60)

            // Don't send notification if less than:
            // - 24 hours for low priority
            // - 6 hours for medium priority
            // - 1 hour for high priority
            const minHours = {
                low: 24,
                medium: 6,
                high: 1
            }

            if (hoursSinceLastNotification < minHours[userInfo.notificationPriority as keyof typeof minHours]) {
                return false
            }
        }

        return true
    } catch (error) {
        console.error('Error checking trial notification eligibility:', error)
        return false
    }
}

// Get trial notification message based on days left and priority
export function getTrialNotificationMessage(daysLeft: number, priority: string): string {
    if (priority === 'high' && daysLeft <= 1) {
        return `🚨 CẢNH BÁO KHẨN CẤP!\nTrial của bạn hết hạn trong ${daysLeft <= 0 ? 'NGAY HÔM NAY' : '24 GIỜ NỮA'}!\n\n💳 Gia hạn ngay để không gián đoạn:\n• 7 ngày: 14,000đ\n• 15 ngày: 30,000đ\n• 30 ngày: 60,000đ\n\n💰 Thanh toán ngay: PAYMENT`
    } else if (priority === 'medium' && daysLeft <= 3) {
        return `⏰ THÔNG BÁO QUAN TRỌNG\nTrial của bạn còn ${daysLeft} ngày!\n\n💡 Hãy gia hạn để tiếp tục sử dụng:\n• Phí: 2,000đ/ngày\n• Gói tối thiểu: 7 ngày = 14,000đ\n\n💳 Chọn PAYMENT để gia hạn`
    } else {
        return `📅 THÔNG BÁO\nTrial của bạn còn ${daysLeft} ngày\n\n💰 Gia hạn tài khoản:\n• Thanh toán: PAYMENT\n• Liên hệ admin: SUPPORT_ADMIN`
    }
}

// Generate horoscope for Tân Dậu (1981) - Simple automated system
export async function generateHoroscope(): Promise<{
    fortune: string
    love: string
    health: string
    career: string
    advice: string
    luckyColor: string
    luckyNumber: number
}> {
    try {
        // Simple automated horoscope for Tân Dậu (1981)
        // Based on Vietnamese zodiac and general astrology

        const fortunes = [
            'Tài lộc dồi dào, có quý nhân phù trợ',
            'Tài lộc ổn định, nên tích góp làm vốn',
            'Tài lộc trung bình, tránh đầu tư lớn',
            'Tài lộc tốt, có cơ hội làm ăn',
            'Tài lộc vượng, nên mở rộng kinh doanh'
        ]

        const loves = [
            'Tình cảm hài hòa, gia đình đầm ấm',
            'Tình cảm ổn định, nên quan tâm người thân',
            'Tình cảm tốt đẹp, có tin vui tình cảm',
            'Tình cảm êm đềm, nên chia sẻ nhiều hơn',
            'Tình cảm nồng thắm, nên dành thời gian cho gia đình'
        ]

        const healths = [
            'Sức khỏe tốt, tinh thần minh mẫn',
            'Sức khỏe ổn định, nên nghỉ ngơi điều độ',
            'Sức khỏe tốt, nên tập thể dục nhẹ nhàng',
            'Sức khỏe dồi dào, nên giữ gìn sức khỏe',
            'Sức khỏe bình thường, chú ý ăn uống'
        ]

        const careers = [
            'Công việc thuận lợi, có cơ hội thăng tiến',
            'Công việc ổn định, nên học hỏi thêm',
            'Công việc tốt, nên mạnh dạn đề xuất ý tưởng',
            'Công việc suôn sẻ, có quý nhân giúp đỡ',
            'Công việc phát triển, nên mở rộng mạng lưới'
        ]

        const advices = [
            'Hôm nay nên mạnh dạn đầu tư kinh doanh',
            'Nên kết nối với bạn bè và đối tác',
            'Hôm nay là ngày tốt để ký kết hợp đồng',
            'Nên dành thời gian cho gia đình và người thân',
            'Hôm nay nên học hỏi kinh nghiệm từ người đi trước',
            'Nên giữ tinh thần lạc quan, tích cực',
            'Hôm nay nên sắp xếp công việc có kế hoạch',
            'Nên chia sẻ khó khăn với người thân'
        ]

        const colors = ['Vàng', 'Trắng', 'Xanh dương', 'Xanh lá', 'Đỏ', 'Tím']
        const numbers = [1, 6, 8, 3, 9, 5, 7]

        // Use current date to generate consistent but varied results
        const today = new Date()
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
        const seed = dayOfYear + today.getFullYear()

        // Simple pseudo-random using seed
        const random = (seed * 9301 + 49297) % 233280
        const random2 = (seed * 49297 + 233280) % 233280

        return {
            fortune: fortunes[random % fortunes.length],
            love: loves[random2 % loves.length],
            health: healths[(random + 1) % healths.length],
            career: careers[(random2 + 1) % careers.length],
            advice: advices[random % advices.length],
            luckyColor: colors[(random + 2) % colors.length],
            luckyNumber: numbers[(random + 3) % numbers.length]
        }
    } catch (error) {
        console.error('Error generating horoscope:', error)
        // Fallback to default data if any error occurs
        return {
            fortune: 'Tài lộc khá tốt, có cơ hội đầu tư',
            love: 'Tình cảm ổn định, nên quan tâm gia đình',
            health: 'Sức khỏe tốt, nên tập thể dục thường xuyên',
            career: 'Công việc thuận lợi',
            advice: 'Hôm nay nên tập trung vào công việc chính',
            luckyColor: 'Vàng',
            luckyNumber: 8
        }
    }
}

// Validate phone number
export function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,11}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Validate email
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Generate unique ID
export function generateId(): string {
    return Math.random().toString(36).substr(2, 9)
}

// Calculate rating average
export function calculateRatingAverage(ratings: number[]): number {
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, rating) => acc + rating, 0)
    return Math.round((sum / ratings.length) * 10) / 10
}

// Format date
export function formatDate(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

// Format datetime
export function formatDateTime(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Get time ago
export function getTimeAgo(date: string | Date): string {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Vừa xong'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substr(0, maxLength) + '...'
}

// Generate random string
export function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0982581222'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Check if string is valid JSON
export function isValidJSON(str: string): boolean {
    try {
        JSON.parse(str)
        return true
    } catch {
        return false
    }
}

// Deep clone object
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

// Update bot session
export async function updateBotSession(facebookId: string, sessionData: any) {
    try {
        const { supabaseAdmin } = await import('./supabase')

        console.log('🔄 updateBotSession called:', {
            facebookId,
            hasSessionData: !!sessionData,
            currentFlow: sessionData?.current_flow,
            step: sessionData?.step
        })

        // CHUẨN HÓA: Luôn lưu current_flow vào cả 2 nơi để đảm bảo tương thích
        const currentFlow = sessionData?.current_flow || null

        // Sử dụng upsert với onConflict để đảm bảo chỉ có 1 record per facebook_id
        const { data, error } = await supabaseAdmin
            .from('bot_sessions')
            .upsert({
                facebook_id: facebookId,
                session_data: sessionData,
                current_flow: currentFlow, // Lưu vào cột riêng để dễ query
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facebook_id'
            })
            .select()

        if (error) {
            console.error('❌ updateBotSession error:', {
                facebookId,
                error: error.message,
                code: error.code,
                sessionData
            })
            return
        }

        console.log('✅ updateBotSession success:', {
            facebookId,
            updated: !!data,
            record: data
        })

    } catch (error) {
        console.error('❌ Exception in updateBotSession:', error)
    }
}

// Get bot session
export async function getBotSession(facebookId: string) {
    try {
        const { supabaseAdmin } = await import('./supabase')

        console.log('🔍 getBotSession called for:', facebookId)

        const { data, error } = await supabaseAdmin
            .from('bot_sessions')
            .select('*')
            .eq('facebook_id', facebookId)
            .single()

        if (error) {
            console.log('❌ getBotSession error:', {
                facebookId,
                error: error.message,
                code: error.code,
                details: error.details
            })

            // Nếu bảng không tồn tại, trả về null
            if (error.code === 'PGRST116' || error.message.includes('relation "bot_sessions" does not exist')) {
                console.log('❌ bot_sessions table does not exist')
                return null
            }

            // Nếu không tìm thấy record, trả về null (bình thường)
            if (error.code === 'PGRST116') {
                console.log('❌ No session found for user:', facebookId)
                return null
            }

            // Các lỗi khác cũng trả về null
            console.log('❌ Other error in getBotSession:', error)
            return null
        }

        console.log('✅ getBotSession success:', {
            facebookId,
            hasData: !!data,
            currentFlow: data?.current_flow,
            sessionData: data?.session_data
        })

        // CHUẨN HÓA: Đảm bảo current_flow có sẵn ở cả 2 nơi
        if (data) {
            const currentFlow = data.current_flow || data.session_data?.current_flow || null

            // Nếu current_flow chỉ có trong session_data, copy ra ngoài
            if (!data.current_flow && data.session_data?.current_flow) {
                data.current_flow = data.session_data.current_flow
            }

            // Nếu current_flow chỉ có ở ngoài, copy vào session_data
            if (data.current_flow && !data.session_data?.current_flow) {
                data.session_data = data.session_data || {}
                data.session_data.current_flow = data.current_flow
            }
        }

        return data
    } catch (error) {
        console.error('❌ Exception in getBotSession:', error)
        return null
    }
}

// Sleep function
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// DEPRECATED: Admin check now handled by FACEBOOK_PAGE_ID check
// This function is kept for backward compatibility but not used
export async function isAdmin(facebookId: string): Promise<boolean> {
    // New logic: Only fanpage messages are admin
    return facebookId === process.env.FACEBOOK_PAGE_ID
}

// Retry function
export async function retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        if (retries > 0) {
            await sleep(delay)
            return retry(fn, retries - 1, delay * 2)
        }
        throw error
    }
}

// Validate Facebook ID format
export function isValidFacebookId(facebookId: string): boolean {
    if (!facebookId || typeof facebookId !== 'string') {
        return false
    }

    // Facebook ID should be numeric and between 10-20 digits
    return /^\d{10,20}$/.test(facebookId)
}

// Create new user with fallback when Facebook API fails
export async function createNewUserWithFallback(facebookId: string): Promise<any> {
    try {
        // Try to get Facebook name first
        const facebookName = await getFacebookDisplayName(facebookId)

        if (facebookName) {
            return {
                facebook_id: facebookId,
                name: facebookName,
                phone: null, // User will provide real phone during registration
                status: 'pending', // Start as pending, not trial
                membership_expires_at: null, // No trial period
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        } else {
            // Fallback when Facebook API fails - still require registration
            return {
                facebook_id: facebookId,
                name: null, // User must provide name during registration
                phone: null, // User must provide phone during registration
                status: 'pending', // Start as pending, not trial
                membership_expires_at: null, // No trial period
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        }
    } catch (error) {
        console.warn('Error creating user with Facebook data, using fallback:', error instanceof Error ? error.message : String(error))
        // Complete fallback - still require registration
        return {
            facebook_id: facebookId,
            name: null, // User must provide name during registration
            phone: null, // User must provide phone during registration
            status: 'pending', // Start as pending, not trial
            membership_expires_at: null, // No trial period
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    }
}

// Get Facebook display name from Facebook API
export async function getFacebookDisplayName(facebookId: string): Promise<string | null> {
    try {
        const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

        // Check if access token exists
        if (!FACEBOOK_ACCESS_TOKEN) {
            console.log('Facebook access token not configured')
            return null
        }

        // Validate Facebook ID format
        if (!isValidFacebookId(facebookId)) {
            console.log('Invalid Facebook ID format:', facebookId)
            return null
        }

        console.log('Fetching Facebook profile for user:', facebookId)

        // Create AbortController for timeout functionality
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${facebookId}?fields=first_name,last_name,name&access_token=${FACEBOOK_ACCESS_TOKEN}`,
            {
                signal: controller.signal
            }
        )

        clearTimeout(timeoutId)

        console.log('Facebook API response status:', response.status)

        if (response.ok) {
            const data = await response.json()
            console.log('Facebook profile data:', JSON.stringify(data, null, 2))

            const displayName = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim()
            if (displayName) {
                console.log('Successfully got Facebook name:', displayName)
                return displayName
            } else {
                console.log('No name found in Facebook profile data')
                return null
            }
        }

        // Handle specific error codes with better logging
        if (response.status === 400) {
            console.warn('Facebook API 400 - Invalid Facebook ID or permissions:', facebookId)
        } else if (response.status === 401) {
            console.warn('Facebook API 401 - Access token invalid or expired')
        } else if (response.status === 403) {
            console.warn('Facebook API 403 - Insufficient permissions for user profile')
        } else if (response.status === 404) {
            console.warn('Facebook API 404 - User not found:', facebookId)
        } else {
            console.warn('Facebook API error:', response.status, response.statusText)
        }

        // Try to get error details for debugging
        try {
            const errorData = await response.json()
            console.warn('Facebook API error details:', JSON.stringify(errorData, null, 2))
        } catch (parseError) {
            console.warn('Could not parse Facebook API error response')
        }

        return null
    } catch (error) {
        // Handle network errors gracefully
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Facebook API request timeout for user:', facebookId)
        } else {
            console.warn('Error getting Facebook display name:', error instanceof Error ? error.message : String(error))
        }
        return null
    }
}
