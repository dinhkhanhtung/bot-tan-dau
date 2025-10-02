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
        const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${facebookId}?fields=first_name,last_name,name&access_token=${FACEBOOK_ACCESS_TOKEN}`
        )

        if (response.ok) {
            const data = await response.json()
            return data.name || data.first_name + ' ' + data.last_name || null
        }

        console.error('Error fetching Facebook profile:', response.statusText)
        return null
    } catch (error) {
        console.error('Error getting Facebook display name:', error)
        return null
    }
}
