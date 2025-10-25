/**
 * Facebook API Utilities
 * Centralized Facebook API operations and utilities
 */

// Validate Facebook ID format
function isValidFacebookId(facebookId: string): boolean {
    if (!facebookId || typeof facebookId !== 'string') {
        return false
    }

    // Facebook ID should be numeric and between 10-20 digits
    return /^\d{10,20}$/.test(facebookId)
}

// Extract Facebook ID from various Facebook link formats
export function extractFacebookId(link: string): string | null {
    if (!link || typeof link !== 'string') {
        return null
    }

    // Handle different Facebook link formats
    const patterns = [
        /facebook\.com\/profile\.php\?id=(\d+)/i,
        /facebook\.com\/([a-zA-Z0-9.]+)\/?/,
        /fb\.me\/([a-zA-Z0-9.]+)\/?/,
        /^(\d+)$/ // Just numeric ID
    ]

    for (const pattern of patterns) {
        const match = link.match(pattern)
        if (match) {
            if (match[1] && /^\d+$/.test(match[1])) {
                return match[1]
            }
        }
    }

    return null
}

// Parse Facebook link and extract user information
export function parseFacebookLink(link: string): {
    type: 'id' | 'username' | 'invalid'
    id: string | null
    profileLink: string | null
    messengerLink: string | null
} {
    if (!link || typeof link !== 'string') {
        return { type: 'invalid', id: null, profileLink: null, messengerLink: null }
    }

    const facebookId = extractFacebookId(link)

    if (facebookId) {
        return {
            type: 'id',
            id: facebookId,
            profileLink: `https://facebook.com/${facebookId}`,
            messengerLink: `https://m.me/${facebookId}`
        }
    }

    // Try to extract username
    const usernameMatch = link.match(/facebook\.com\/([a-zA-Z0-9.]+)\/?/)
    if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1]
        return {
            type: 'username',
            id: null, // We don't have the ID for username-only links
            profileLink: `https://facebook.com/${username}`,
            messengerLink: `https://m.me/${username}`
        }
    }

    return { type: 'invalid', id: null, profileLink: null, messengerLink: null }
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

        // Handle specific error codes - Page Access Tokens typically don't have user profile permissions
        if (response.status === 400) {
            console.warn('Facebook API 400 - Invalid Facebook ID or permissions:', facebookId)
            console.warn('Note: Page Access Tokens typically cannot access user profiles. Consider using User Access Token or skip this step.')
        } else if (response.status === 401) {
            console.warn('Facebook API 401 - Access token invalid or expired')
        } else if (response.status === 403) {
            console.warn('Facebook API 403 - Insufficient permissions for user profile')
            console.warn('Note: Page Access Tokens typically cannot access user profiles. Consider using User Access Token or skip this step.')
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
