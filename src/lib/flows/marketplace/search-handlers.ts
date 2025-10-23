import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../../facebook-api'
import { formatCurrency } from '../../utils'
import { CATEGORIES, LOCATIONS } from '../../constants'
import { logger } from '../../logger'
import { performSearch, cancelSearch } from './search-utils'

/**
 * Search Handlers - Handles postback events and step processing for search flow
 */
export class SearchHandlers extends BaseFlow {
    readonly flowName = 'search'

    /**
     * Check if this flow can handle the user/session
     */
    canHandle(user: any, session: any): boolean {
        // Handle null user case (for flow trigger checking)
        if (!user) {
            return true // Allow flow to be triggered for all users
        }

        // Can handle if user wants to search products
        return session?.current_flow === 'search' || !session
    }

    /**
     * Perform search
     */
    async performSearch(user: any): Promise<void> {
        // Get search criteria
        const searchData = await SessionManager.getSessionData(user.facebook_id)
        await performSearch(user, searchData)
    }

    /**
     * Cancel search
     */
    async cancelSearch(user: any): Promise<void> {
        await cancelSearch(user)
    }

    /**
     * Handle category postback
     */
    async handleCategoryPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`📂 Processing category postback for user: ${user.facebook_id}`)

            const category = payload.replace('SELECT_CATEGORY_', '')
            console.log(`[DEBUG] Selected category: ${category}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with category
            await SessionManager.updateSession(user.facebook_id, {
                step: 2,
                data: {
                    ...currentData,
                    category: category
                }
            })

            // Send location prompt
            await sendMessage(user.facebook_id,
                `✅ Danh mục: ${category}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 3/3: Chọn địa điểm (tùy chọn)\n💡 Chọn địa điểm để thu hẹp kết quả tìm kiếm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send location buttons
            await this.sendLocationButtons(user.facebook_id)

            console.log('✅ Category step completed, moved to location step')

        } catch (error) {
            await this.handleError(user, error, 'handleCategoryPostback')
        }
    }

    /**
     * Handle location postback
     */
    async handleLocationPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`📍 Processing location postback for user: ${user.facebook_id}`)

            const location = payload.replace('SELECT_LOCATION_', '')
            console.log(`[DEBUG] Selected location: ${location}`)

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with location
            await SessionManager.updateSession(user.facebook_id, {
                step: 3,
                data: {
                    ...currentData,
                    location: location
                }
            })

            // Perform search
            await this.performSearch(user)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationPostback')
        }
    }

    /**
     * Handle view listing postback
     */
    async handleViewListingPostback(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`👁️ Processing view listing postback for user: ${user.facebook_id}`)

            const listingId = payload.replace('VIEW_LISTING_', '')
            console.log(`[DEBUG] Viewing listing: ${listingId}`)

            // Get listing details
            const { supabaseAdmin } = await import('../../supabase')
            const { data: listing, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('id', listingId)
                .single()

            if (error || !listing) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy sản phẩm!')
                return
            }

            // Send listing details
            await sendGenericTemplate(user.facebook_id, [
                createGenericElement(
                    listing.title,
                    listing.description,
                    undefined, // No image for now
                    [
                        {
                            type: 'postback',
                            title: '💬 Liên hệ người bán',
                            payload: `CONTACT_SELLER_${listing.user_id}`
                        }
                    ]
                )
            ])

        } catch (error) {
            await this.handleError(user, error, 'handleViewListingPostback')
        }
    }

    /**
     * Handle category step - Only show buttons, no text processing
     */
    async handleCategoryStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📂 Processing category step for user: ${user.facebook_id}`)

            // Always show category buttons for user selection
            // Ignore any text input - only buttons are valid
            await this.sendCategoryButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleCategoryStep')
        }
    }

    /**
     * Handle location step - Only show buttons, no text processing
     */
    async handleLocationStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📍 Processing location step for user: ${user.facebook_id}`)

            // Always show location buttons for user selection
            // Ignore any text input - only buttons are valid
            await this.sendLocationButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationStep')
        }
    }

    /**
     * Handle keyword step
     */
    async handleKeywordStep(user: any, text: string): Promise<void> {
        try {
            console.log(`🔑 Processing keyword step for user: ${user.facebook_id}`)

            // Update session with keyword
            await SessionManager.updateSession(user.facebook_id, {
                step: 1,
                data: { keyword: text.trim() }
            })

            // Send category prompt
            await sendMessage(user.facebook_id, 
                `✅ Từ khóa: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📂 Bước 2/3: Chọn danh mục (tùy chọn)\n💡 Chọn danh mục để thu hẹp kết quả tìm kiếm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send category buttons
            await this.sendCategoryButtons(user.facebook_id)

            console.log('✅ Keyword step completed, moved to category step')

        } catch (error) {
            await this.handleError(user, error, 'handleKeywordStep')
        }
    }

    /**
     * Handle search suggestion postback
     */
    async handleSearchSuggestion(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`💡 Processing search suggestion for user: ${user.facebook_id}`)

            const suggestion = payload.replace('SEARCH_SUGGESTION_', '')
            console.log(`[DEBUG] Search suggestion: ${suggestion}`)

            // Create new search session with suggestion
            await SessionManager.createSession(user.facebook_id, 'search', 3, {
                keyword: suggestion
            })

            // Perform search with suggestion
            await this.performSearch(user)

        } catch (error) {
            await this.handleError(user, error, 'handleSearchSuggestion')
        }
    }

    /**
     * Handle quick keyword search
     */
    async handleQuickKeywordSearch(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`⚡ Processing quick keyword search for user: ${user.facebook_id}`)

            const hashtag = payload.replace('QUICK_KEYWORD_', '')
            console.log(`[DEBUG] Quick keyword: ${hashtag}`)

            // Create search session with hashtag
            await SessionManager.createSession(user.facebook_id, 'search', 3, {
                keyword: hashtag
            })

            // Perform search with hashtag
            await this.performSearch(user)

        } catch (error) {
            await this.handleError(user, error, 'handleQuickKeywordSearch')
        }
    }

    /**
     * Handle continue search all
     */
    async handleContinueSearchAll(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`▶️ Processing continue search all for user: ${user.facebook_id}`)

            const batchIndex = parseInt(payload.replace('CONTINUE_SEARCH_ALL_', ''))
            console.log(`[DEBUG] Continue from batch: ${batchIndex}`)

            // Get all active listings
            const { supabaseAdmin } = await import('../../supabase')
            const { data: allListings, error: fetchError } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(20)

            if (fetchError || !allListings) {
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Filter out listings with invalid data
            const validListings = allListings.filter(listing =>
                listing.title &&
                listing.price != null &&
                listing.location &&
                typeof listing.price === 'number' &&
                !isNaN(listing.price)
            )

            if (validListings.length === 0) {
                await sendMessage(user.facebook_id, '❌ Không còn sản phẩm hợp lệ nào để hiển thị!')
                return
            }

            // Calculate which batch to show
            const startIndex = batchIndex * 10
            const endIndex = Math.min(startIndex + 10, validListings.length)
            const batch = validListings.slice(startIndex, endIndex)
            const isLastBatch = endIndex >= validListings.length

            if (batch.length === 0) {
                await sendMessage(user.facebook_id, '❌ Không còn sản phẩm nào để hiển thị!')
                return
            }

            // Send next batch
            const elements = batch.map(listing =>
                createGenericElement(
                    listing.title,
                    `${formatCurrency(listing.price)} • ${listing.location}${listing.category ? ` • ${listing.category}` : ''}`,
                    undefined,
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

            // Add continue prompt if not last batch
            if (!isLastBatch) {
                await sendQuickReply(user.facebook_id,
                    `📊 Đã hiển thị ${endIndex}/${validListings.length} sản phẩm`,
                    [
                        createQuickReply('▶️ Tiếp tục xem', `CONTINUE_SEARCH_ALL_${batchIndex + 1}`),
                        createQuickReply('🔍 Tìm kiếm khác', 'SEARCH')
                    ]
                )
            } else {
                await sendMessage(user.facebook_id,
                    `✅ Đã hiển thị tất cả ${validListings.length} sản phẩm hợp lệ`)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleContinueSearchAll')
        }
    }

    /**
     * Handle next categories page
     */
    async handleNextCategories(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`▶️ Processing next categories for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('NEXT_CATEGORIES_', ''))
            console.log(`[DEBUG] Next categories page: ${pageIndex}`)

            await this.sendCategoriesPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handleNextCategories')
        }
    }

    /**
     * Handle previous categories page
     */
    async handlePrevCategories(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`◀️ Processing previous categories for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('PREV_CATEGORIES_', ''))
            console.log(`[DEBUG] Previous categories page: ${pageIndex}`)

            await this.sendCategoriesPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handlePrevCategories')
        }
    }

    /**
     * Handle next locations page
     */
    async handleNextLocations(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`▶️ Processing next locations for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('NEXT_LOCATIONS_', ''))
            console.log(`[DEBUG] Next locations page: ${pageIndex}`)

            await this.sendLocationsPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handleNextLocations')
        }
    }

    /**
     * Handle previous locations page
     */
    async handlePrevLocations(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`◀️ Processing previous locations for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('PREV_LOCATIONS_', ''))
            console.log(`[DEBUG] Previous locations page: ${pageIndex}`)

            await this.sendLocationsPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handlePrevLocations')
        }
    }

    /**
     * Send category buttons (limited to 13 per message due to Facebook API limit)
     */
    async sendCategoryButtons(facebookId: string): Promise<void> {
        const categories = Object.keys(CATEGORIES)
        const maxButtons = 13 // Facebook API limit for quick replies

        if (categories.length <= maxButtons) {
            // Send all categories in one message
            const quickReplies = categories.map(category =>
                createQuickReply(category, `SELECT_CATEGORY_${category}`)
            )
            await sendQuickReply(facebookId, 'Chọn danh mục:', quickReplies)
        } else {
            // Split categories into batches
            const batches = this.chunkArray(categories, maxButtons - 2) // Reserve 2 slots for navigation buttons

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const isLastBatch = i === batches.length - 1
                const isFirstBatch = i === 0

                const quickReplies = batch.map(category =>
                    createQuickReply(category, `SELECT_CATEGORY_${category}`)
                )

                // Add navigation buttons if not the last batch
                if (!isLastBatch) {
                    quickReplies.push(
                        createQuickReply('▶️ Xem thêm', `NEXT_CATEGORIES_${i + 1}`)
                    )
                }

                // Add back button if not the first batch
                if (!isFirstBatch) {
                    quickReplies.push(
                        createQuickReply('◀️ Quay lại', `PREV_CATEGORIES_${i - 1}`)
                    )
                }

                const batchMessage = isFirstBatch
                    ? `Chọn danh mục (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), categories.length)}/${categories.length}):`
                    : `Danh mục (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), categories.length)}/${categories.length}):`

                await sendQuickReply(facebookId, batchMessage, quickReplies)

                // If this is the first batch and there are more, stop here and wait for user input
                if (isFirstBatch && !isLastBatch) {
                    break
                }
            }
        }
    }

    /**
     * Send location buttons (limited to 13 per message due to Facebook API limit)
     */
    async sendLocationButtons(facebookId: string): Promise<void> {
        const locations = [...LOCATIONS]
        const maxButtons = 13 // Facebook API limit for quick replies

        if (locations.length <= maxButtons) {
            // Send all locations in one message
            const quickReplies = locations.map(location =>
                createQuickReply(location, `SELECT_LOCATION_${location}`)
            )
            await sendQuickReply(facebookId, 'Chọn địa điểm:', quickReplies)
        } else {
            // Send paginated locations
            await this.sendLocationsPage(facebookId, 0)
        }
    }

    /**
     * Send locations page with pagination
     */
    async sendLocationsPage(facebookId: string, pageIndex: number): Promise<void> {
        const locations = [...LOCATIONS]
        const maxButtons = 13 // Facebook API limit for quick replies

        const startIndex = pageIndex * (maxButtons - 2) // Reserve 2 slots for navigation
        const endIndex = Math.min(startIndex + (maxButtons - 2), locations.length)
        const currentPageLocations = locations.slice(startIndex, endIndex)

        const isLastPage = endIndex >= locations.length
        const isFirstPage = pageIndex === 0

        const quickReplies = currentPageLocations.map(location =>
            createQuickReply(location, `SELECT_LOCATION_${location}`)
        )

        // Add navigation buttons
        if (!isLastPage) {
            quickReplies.push(
                createQuickReply('▶️ Xem thêm', `NEXT_LOCATIONS_${pageIndex + 1}`)
            )
        }

        if (!isFirstPage) {
            quickReplies.push(
                createQuickReply('◀️ Quay lại', `PREV_LOCATIONS_${pageIndex - 1}`)
            )
        }

        const pageMessage = `Chọn địa điểm (${startIndex + 1}-${endIndex}/${locations.length}):`

        await sendQuickReply(facebookId, pageMessage, quickReplies)
    }

    /**
     * Send categories page with pagination
     */
    async sendCategoriesPage(facebookId: string, pageIndex: number): Promise<void> {
        const categories = Object.keys(CATEGORIES)
        const maxButtons = 13 // Facebook API limit for quick replies

        const startIndex = pageIndex * (maxButtons - 2) // Reserve 2 slots for navigation
        const endIndex = Math.min(startIndex + (maxButtons - 2), categories.length)
        const currentPageCategories = categories.slice(startIndex, endIndex)

        const isLastPage = endIndex >= categories.length
        const isFirstPage = pageIndex === 0

        const quickReplies = currentPageCategories.map(category =>
            createQuickReply(category, `SELECT_CATEGORY_${category}`)
        )

        // Add navigation buttons
        if (!isLastPage) {
            quickReplies.push(
                createQuickReply('▶️ Xem thêm', `NEXT_CATEGORIES_${pageIndex + 1}`)
            )
        }

        if (!isFirstPage) {
            quickReplies.push(
                createQuickReply('◀️ Quay lại', `PREV_CATEGORIES_${pageIndex - 1}`)
            )
        }

        const pageMessage = `Danh mục (${startIndex + 1}-${endIndex}/${categories.length}):`

        await sendQuickReply(facebookId, pageMessage, quickReplies)
    }

    /**
     * Helper function to chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize))
        }
        return chunks
    }
}