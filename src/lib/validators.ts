// Validation utilities

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

// Check if string is valid JSON
export function isValidJSON(str: string): boolean {
    try {
        JSON.parse(str)
        return true
    } catch {
        return false
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