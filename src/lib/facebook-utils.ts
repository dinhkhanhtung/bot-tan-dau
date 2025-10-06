/**
 * Utility functions for Facebook operations
 */

/**
 * Extract Facebook ID from various Facebook link formats
 * @param input - Facebook link or ID
 * @returns Facebook ID or username, null if not found
 */
export function extractFacebookId(input: string): string | null {
    if (!input.trim()) return null

    // If input is just numbers (pure Facebook ID)
    if (/^\d+$/.test(input.trim())) {
        return input.trim()
    }

    // Common Facebook link patterns
    const patterns = [
        // https://www.facebook.com/profile.php?id=123456789
        /facebook\.com\/profile\.php\?id=(\d+)/,
        // https://www.facebook.com/username
        /facebook\.com\/([a-zA-Z0-9._-]+)/,
        // https://m.facebook.com/profile.php?id=123456789
        /m\.facebook\.com\/profile\.php\?id=(\d+)/,
        // https://m.facebook.com/username
        /m\.facebook\.com\/([a-zA-Z0-9._-]+)/,
        // https://fb.com/username
        /fb\.com\/([a-zA-Z0-9._-]+)/,
        // https://fb.me/username
        /fb\.me\/([a-zA-Z0-9._-]+)/,
        // messenger.com/t/username
        /messenger\.com\/t\/([a-zA-Z0-9._-]+)/,
        // m.me/username
        /m\.me\/([a-zA-Z0-9._-]+)/
    ]

    for (const pattern of patterns) {
        const match = input.match(pattern)
        if (match) {
            const extracted = match[1]
            // If it's a number, it's an ID
            if (/^\d+$/.test(extracted)) {
                return extracted
            }
            // If it's a username, return username (may need to convert to ID later)
            return extracted
        }
    }

    return null
}

/**
 * Check if a string is a valid Facebook ID (numeric)
 * @param id - String to check
 * @returns true if valid Facebook ID
 */
export function isValidFacebookId(id: string): boolean {
    return /^\d+$/.test(id.trim())
}

/**
 * Check if a string is a Facebook username (non-numeric)
 * @param username - String to check
 * @returns true if looks like a Facebook username
 */
export function isFacebookUsername(username: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(username.trim()) && !/^\d+$/.test(username.trim())
}

/**
 * Convert Facebook link to messenger link
 * @param facebookLink - Facebook profile link
 * @returns Messenger link or null if conversion not possible
 */
export function convertToMessengerLink(facebookLink: string): string | null {
    const id = extractFacebookId(facebookLink)
    if (!id) return null

    // If it's a numeric ID, use m.me
    if (isValidFacebookId(id)) {
        return `https://m.me/${id}`
    }

    // If it's a username, use m.me
    if (isFacebookUsername(id)) {
        return `https://m.me/${id}`
    }

    return null
}

/**
 * Get Facebook profile link from ID or username
 * @param id - Facebook ID or username
 * @returns Facebook profile link
 */
export function getFacebookProfileLink(id: string): string {
    if (isValidFacebookId(id)) {
        return `https://www.facebook.com/profile.php?id=${id}`
    }
    return `https://www.facebook.com/${id}`
}

/**
 * Parse Facebook link and return structured data
 * @param input - Facebook link or ID
 * @returns Object with type, id, and links
 */
export function parseFacebookLink(input: string): {
    type: 'id' | 'username' | 'invalid'
    id: string | null
    profileLink: string | null
    messengerLink: string | null
} {
    const extracted = extractFacebookId(input)

    if (!extracted) {
        return {
            type: 'invalid',
            id: null,
            profileLink: null,
            messengerLink: null
        }
    }

    const isId = isValidFacebookId(extracted)
    const isUsername = isFacebookUsername(extracted)

    return {
        type: isId ? 'id' : isUsername ? 'username' : 'invalid',
        id: extracted,
        profileLink: getFacebookProfileLink(extracted),
        messengerLink: convertToMessengerLink(input)
    }
}
