import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy') {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: vi })
}

export function formatRelativeTime(date: string | Date) {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (isToday(dateObj)) {
        return 'Hôm nay'
    }

    if (isYesterday(dateObj)) {
        return 'Hôm qua'
    }

    return formatDistanceToNow(dateObj, {
        addSuffix: true,
        locale: vi
    })
}

export function formatDateTime(date: string | Date) {
    return formatDate(date, 'dd/MM/yyyy HH:mm')
}

// Number formatting utilities
export function formatCurrency(amount: number, currency: string = 'VND') {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
    }).format(amount)
}

export function formatNumber(num: number) {
    return new Intl.NumberFormat('vi-VN').format(num)
}

// String utilities
export function truncateText(text: string, maxLength: number = 100) {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
}

export function capitalizeFirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function generateSlug(text: string) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

// Validation utilities
export function isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export function isValidPhone(phone: string) {
    const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8,9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function isValidVietnamesePhone(phone: string) {
    const cleanPhone = phone.replace(/\s/g, '')
    const phoneRegex = /^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/
    return phoneRegex.test(cleanPhone)
}

// Age verification for Tân Dậu 1981
export function verifyTandauAge(birthday: string | Date) {
    const birthYear = typeof birthday === 'string' ? new Date(birthday).getFullYear() : birthday.getFullYear()
    return birthYear === 1981
}

export function calculateAge(birthday: string | Date) {
    const birthDate = typeof birthday === 'string' ? new Date(birthday) : birthday
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}

// Array utilities
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
    return array.reduce((groups, item) => {
        const group = String(item[key])
        groups[group] = groups[group] || []
        groups[group].push(item)
        return groups
    }, {} as Record<string, T[]>)
}

export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
    const seen = new Set()
    return array.filter(item => {
        const value = item[key]
        if (seen.has(value)) {
            return false
        }
        seen.add(value)
        return true
    })
}

// Object utilities
export function omit<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> {
    const result = { ...obj }
    keys.forEach(key => delete result[key])
    return result
}

export function pick<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key]
        }
    })
    return result
}

// URL utilities
export function buildUrl(base: string, params: Record<string, string | number | boolean>) {
    const url = new URL(base)
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
    })
    return url.toString()
}

export function getQueryParams(searchParams: URLSearchParams) {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
        params[key] = value
    })
    return params
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue

    try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
    } catch {
        return defaultValue
    }
}

export function setToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Silently fail
    }
}

export function removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(key)
    } catch {
        // Silently fail
    }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    return 'Đã xảy ra lỗi không xác định'
}

// File utilities
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// Random utilities
export function generateId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export function generateReferralCode(userId: string): string {
    return `TD1981-${userId.slice(-6).toUpperCase()}`
}

// Color utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
