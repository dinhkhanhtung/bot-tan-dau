// Formatting utilities

// Format currency
export function formatCurrency(amount: number | null | undefined): string {
    if (amount == null || isNaN(amount)) {
        return '0đ'
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount)
}

// Format number with thousand separators
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('vi-VN').format(num)
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