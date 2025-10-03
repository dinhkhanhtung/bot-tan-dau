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

// Calculate days until expiry - FIXED: Handle timezone and date parsing properly
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

// Generate random horoscope
export function generateHoroscope(): {
    fortune: string
    love: string
    health: string
    career: string
    advice: string
    luckyColor: string
    luckyNumber: number
} {
    const fortunes = ['Rất tốt', 'Tốt', 'Bình thường', 'Kém']
    const loves = ['Rất tốt', 'Tốt', 'Bình thường', 'Kém']
    const healths = ['Rất tốt', 'Tốt', 'Bình thường', 'Kém']
    const careers = ['Rất tốt', 'Tốt', 'Bình thường', 'Kém']

    const advices = [
        'Hôm nay nên ký kết hợp đồng',
        'Nên gặp gỡ bạn bè cũ',
        'Tránh căng thẳng, nghỉ ngơi nhiều hơn',
        'Tập thể dục nhẹ nhàng',
        'Nên đầu tư bất động sản',
        'Tránh cho vay tiền'
    ]

    const colors = ['Vàng', 'Trắng', 'Xanh dương', 'Xanh lá', 'Đỏ']
    const numbers = [1, 6, 8, 3, 9, 5]

    return {
        fortune: fortunes[Math.floor(Math.random() * fortunes.length)],
        love: loves[Math.floor(Math.random() * loves.length)],
        health: healths[Math.floor(Math.random() * healths.length)],
        career: careers[Math.floor(Math.random() * careers.length)],
        advice: advices[Math.floor(Math.random() * advices.length)],
        luckyColor: colors[Math.floor(Math.random() * colors.length)],
        luckyNumber: numbers[Math.floor(Math.random() * numbers.length)]
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
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
    const { supabaseAdmin } = await import('./supabase')
    await supabaseAdmin
        .from('bot_sessions')
        .upsert({
            facebook_id: facebookId,
            session_data: sessionData,
            updated_at: new Date().toISOString()
        })
}

// Get bot session
export async function getBotSession(facebookId: string) {
    const { supabaseAdmin } = await import('./supabase')
    const { data, error } = await supabaseAdmin
        .from('bot_sessions')
        .select('*')
        .eq('facebook_id', facebookId)
        .single()

    if (error) return null
    return data
}

// Sleep function
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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

// Get Facebook display name from Facebook API
export async function getFacebookDisplayName(facebookId: string): Promise<string | null> {
    try {
        const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN

        // Check if access token exists
        if (!FACEBOOK_ACCESS_TOKEN) {
            console.log('Facebook access token not configured')
            return null
        }

        console.log('Fetching Facebook profile for user:', facebookId)

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${facebookId}?fields=first_name,last_name,name&access_token=${FACEBOOK_ACCESS_TOKEN}`
        )

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

        // Handle specific error codes
        if (response.status === 400) {
            console.error('Bad Request - Check if Facebook ID is valid:', facebookId)
        } else if (response.status === 401) {
            console.error('Unauthorized - Check if access token is valid and has required permissions')
        } else if (response.status === 403) {
            console.error('Forbidden - Access token may not have permission to access user profile')
        } else if (response.status === 404) {
            console.error('User not found - Facebook ID may be invalid:', facebookId)
        } else {
            console.error('Facebook API error:', response.status, response.statusText)
        }

        // Try to get error details
        try {
            const errorData = await response.json()
            console.error('Facebook API error details:', JSON.stringify(errorData, null, 2))
        } catch (parseError) {
            console.error('Could not parse error response')
        }

        return null
    } catch (error) {
        console.error('Error getting Facebook display name:', error)
        return null
    }
}
