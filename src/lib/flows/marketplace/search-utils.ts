/**
 * Search Utils - Utility functions for search flow
 *
 * This module provides a collection of utility functions used by the search flow system.
 * It handles search operations, filtering, suggestions, and data processing in a
 * centralized and reusable manner.
 *
 * Key Features:
 * - Enhanced keyword-based search with hashtag support
 * - GPS-based location filtering
 * - Search suggestions and related keywords
 * - User preference tracking
 * - Activity logging for analytics
 *
 * @author Bot System
 * @version 2.1.0
 * @since 2024
 */

import { sendMessage } from '../../facebook-api'
import { formatCurrency } from '../../formatters'
import { SEARCH_HELPERS, CATEGORIES, KEYWORDS_SYSTEM } from '../../constants'
import { logger } from '../../logger'

/**
 * Search Utils - Utility functions for search flow
 */

/**
 * Enhanced search with keyword system
 */
export function searchWithKeywords(listings: any[], keyword: string): any[] {
    // Use the enhanced search helpers from constants
    return SEARCH_HELPERS.searchWithHashtags(listings, keyword)
}

/**
 * Generate search summary message
 */
export function generateSearchSummary(keyword?: string, category?: string, location?: string, resultCount?: number): string {
    let summary = `🔍 KẾT QUẢ TÌM KIẾM\n━━━━━━━━━━━━━━━━━━━━\n`

    if (keyword) summary += `🔑 Từ khóa: ${keyword}\n`
    if (category) summary += `📂 Danh mục: ${category}\n`
    if (location) summary += `📍 Địa điểm: ${location}\n`

    summary += `━━━━━━━━━━━━━━━━━━━━\n`
    summary += `📊 Tìm thấy ${resultCount} sản phẩm\n`
    summary += `━━━━━━━━━━━━━━━━━━━━`

    return summary
}

/**
 * Send search suggestions when results are limited
 */
export async function sendSearchSuggestions(facebookId: string, currentKeyword?: string, category?: string): Promise<void> {
    try {
        const suggestions = []

        // Suggest popular keywords
        if (currentKeyword) {
            const relatedKeywords = findRelatedKeywords(currentKeyword)
            suggestions.push(...relatedKeywords.slice(0, 3))
        }

        // Suggest related categories
        if (category) {
            const relatedCategories = findRelatedCategories(category)
            suggestions.push(...relatedCategories.slice(0, 2))
        }

        if (suggestions.length > 0) {
            const { sendQuickReply, createQuickReply } = await import('../../facebook-api')
            const suggestionButtons = suggestions.map(suggestion =>
                createQuickReply(suggestion, `SEARCH_SUGGESTION_${suggestion}`)
            )

            await sendQuickReply(facebookId,
                '💡 Gợi ý tìm kiếm khác:',
                suggestionButtons
            )
        }
    } catch (error) {
        console.error('Error sending search suggestions:', error)
    }
}

/**
 * Find related keywords for suggestions
 */
export function findRelatedKeywords(keyword: string): string[] {
    const related = []

    // Check popular keywords
    for (const popularKeyword of KEYWORDS_SYSTEM.POPULAR_KEYWORDS || []) {
        if (popularKeyword.includes(keyword) || keyword.includes(popularKeyword)) {
            related.push(popularKeyword)
        }
    }

    return related
}

/**
 * Find related categories for suggestions
 */
export function findRelatedCategories(category: string): string[] {
    const related = []

    // Simple category relationship mapping
    const categoryRelations: { [key: string]: string[] } = {
        'Y TẾ': ['ĐỒ GIA DỤNG', 'ẨM THỰC'],
        'Ô TÔ': ['ĐIỆN TỬ', 'DỊCH VỤ'],
        'ĐIỆN TỬ': ['Ô TÔ', 'ĐỒ GIA DỤNG'],
        'THỜI TRANG': ['ĐỒ GIA DỤNG', 'ẨM THỰC'],
        'ẨM THỰC': ['ĐỒ GIA DỤNG', 'DỊCH VỤ']
    }

    const relations = categoryRelations[category] || []
    related.push(...relations)

    return related
}

/**
 * Filter listings by GPS distance from user location
 */
export function filterByGPSDistance(listings: any[], user: any, radiusKm: number): any[] {
    if (!user.latitude || !user.longitude) {
        return listings
    }

    return listings.filter(listing => {
        // For now, use simple location name matching since listings don't have GPS coordinates
        // In a real implementation, you'd calculate actual distance using GPS coordinates
        const userLocation = user.location.toLowerCase()
        const listingLocation = listing.location.toLowerCase()

        // Check if locations match (exact or partial)
        return listingLocation.includes(userLocation) ||
               userLocation.includes(listingLocation) ||
               calculateLocationSimilarity(userLocation, listingLocation) > 0.7
    })
}

/**
 * Calculate similarity between two location strings
 */
export function calculateLocationSimilarity(location1: string, location2: string): number {
    // Simple similarity calculation based on common words
    const words1 = location1.split(' ')
    const words2 = location2.split(' ')

    const commonWords = words1.filter(word =>
        words2.some(w2 => w2.includes(word) || word.includes(w2))
    )

    return commonWords.length / Math.max(words1.length, words2.length)
}

/**
 * Update user's preferred categories based on search history
 */
export async function updateUserPreferredCategories(facebookId: string, category: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('../../supabase')

        // Get current preferred categories
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('preferred_categories')
            .eq('facebook_id', facebookId)
            .single()

        if (userError || !user) {
            logger.warn('User not found for category update:', { facebook_id: facebookId })
            return
        }

        let preferredCategories = user.preferred_categories || []

        // Add category if not already in list (max 5 categories)
        if (!preferredCategories.includes(category)) {
            preferredCategories.push(category)
            if (preferredCategories.length > 5) {
                preferredCategories = preferredCategories.slice(-5)
            }

            // Update user's preferred categories
            await supabaseAdmin
                .from('users')
                .update({
                    preferred_categories: preferredCategories,
                    updated_at: new Date().toISOString()
                })
                .eq('facebook_id', facebookId)
        }

    } catch (error) {
        logger.error('Error updating preferred categories:', { facebook_id: facebookId, error })
    }
}

/**
 * Perform search and send results
 */
export async function performSearch(user: any, searchData: any): Promise<void> {
    try {
        console.log(`🔍 Performing enhanced search for user: ${user.facebook_id}`)

        const { keyword, category, location } = searchData

        // Log search activity for history tracking
        await logSearchActivity(user, keyword, category, location)

        // Get all active listings
        const { supabaseAdmin } = await import('../../supabase')
        let query = supabaseAdmin
            .from('listings')
            .select('*')
            .eq('status', 'active')

        const { data: allListings, error: fetchError } = await query

        if (fetchError) {
            console.error('❌ Search error:', fetchError)
            await sendErrorMessage(user.facebook_id)
            return
        }

        if (!allListings || allListings.length === 0) {
            await sendMessage(user.facebook_id, '❌ Không tìm thấy sản phẩm nào phù hợp!')
            await cancelSearch(user)
            return
        }

        // Apply intelligent filtering
        let filteredListings = allListings

        // Filter out listings with invalid data
        filteredListings = filteredListings.filter(listing =>
            listing.title &&
            listing.price != null &&
            listing.location &&
            typeof listing.price === 'number' &&
            !isNaN(listing.price)
        )

        // Apply GPS-based filtering if user has GPS coordinates
        if (user.latitude && user.longitude && user.search_radius_km) {
            filteredListings = filterByGPSDistance(filteredListings, user, user.search_radius_km)
        }

        // Filter by category if specified
        if (category) {
            filteredListings = filteredListings.filter(listing =>
                listing.category === category
            )
        }

        // Filter by location if specified
        if (location) {
            filteredListings = filteredListings.filter(listing =>
                listing.location === location
            )
        }

        // Apply keyword matching if specified
        if (keyword && keyword.trim()) {
            // Use enhanced search with keyword system
            filteredListings = searchWithKeywords(filteredListings, keyword.trim())
        }

        // Limit results
        const finalListings = filteredListings.slice(0, 10)

        if (finalListings.length === 0) {
            await sendMessage(user.facebook_id,
                `❌ Không tìm thấy sản phẩm nào phù hợp!\n━━━━━━━━━━━━━━━━━━━━\n💡 Thử tìm kiếm với từ khóa khác hoặc mở rộng vùng tìm kiếm`)
            await cancelSearch(user)
            return
        }

        // Send enhanced search results
        const searchSummary = generateSearchSummary(keyword, category, location, finalListings.length)
        await sendMessage(user.facebook_id, searchSummary)

        // Send listings as generic template with enhanced info
        const { sendGenericTemplate, createGenericElement } = await import('../../facebook-api')
        const elements = finalListings.map(listing =>
            createGenericElement(
                listing.title,
                `${formatCurrency(listing.price)} • ${listing.location}`,
                undefined, // No image for now
                [
                    {
                        type: 'postback',
                        title: '👁️ Xem chi tiết',
                        payload: `VIEW_LISTING_${listing.id}`
                    }
                ]
            )
        )

        await sendGenericTemplate(user.facebook_id, elements)

        // Add search suggestions if results are few
        if (finalListings.length < 5 && finalListings.length > 0) {
            await sendSearchSuggestions(user.facebook_id, keyword, category)
        }

        // Clear session
        const { SessionManager } = await import('../../core/session-manager')
        await SessionManager.deleteSession(user.facebook_id)

        console.log('✅ Enhanced search completed successfully')

    } catch (error) {
        console.error('Error in performSearch:', error)
        await sendErrorMessage(user.facebook_id)
    }
}

/**
 * Log search activity for history tracking
 */
async function logSearchActivity(user: any, keyword?: string, category?: string, location?: string): Promise<void> {
    try {
        const { supabaseAdmin } = await import('../../supabase')

        // Log to user_activity_logs
        await supabaseAdmin
            .from('user_activity_logs')
            .insert({
                facebook_id: user.facebook_id,
                user_type: 'user',
                action: 'search',
                details: {
                    keyword: keyword || null,
                    category: category || null,
                    location: location || user.location || null,
                    timestamp: new Date().toISOString()
                },
                success: true,
                response_time_ms: Date.now() - (user.last_activity || Date.now()),
                created_at: new Date().toISOString()
            })

        // Update user activities summary
        const today = new Date().toISOString().split('T')[0]
        await supabaseAdmin
            .from('user_activities')
            .upsert({
                facebook_id: user.facebook_id,
                date: today,
                searches_count: 1, // This will be incremented by the database
                last_activity: new Date().toISOString()
            }, {
                onConflict: 'facebook_id date'
            })

        // Update user's preferred categories based on search history
        if (category) {
            await updateUserPreferredCategories(user.facebook_id, category)
        }

        logger.debug('Search activity logged:', {
            facebook_id: user.facebook_id,
            keyword,
            category,
            location
        })

    } catch (error) {
        logger.error('Error logging search activity:', { facebook_id: user.facebook_id, error })
    }
}

/**
 * Cancel search
 */
export async function cancelSearch(user: any): Promise<void> {
    try {
        const { SessionManager } = await import('../../core/session-manager')
        await SessionManager.deleteSession(user.facebook_id)
        await sendMessage(user.facebook_id, '❌ Đã hủy tìm kiếm. Chào tạm biệt!')
    } catch (error) {
        console.error('Error in cancelSearch:', error)
    }
}

/**
 * Send error message
 */
async function sendErrorMessage(facebookId: string): Promise<void> {
    try {
        await sendMessage(facebookId, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
    } catch (error) {
        console.error('Error sending error message:', error)
    }
}