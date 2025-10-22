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
import { CATEGORIES, LOCATIONS, KEYWORDS_SYSTEM, SEARCH_HELPERS } from '../../constants'

/**
 * Search Flow - Clean, modular implementation
 * Handles product search process with consistent session management
 */
export class SearchFlow extends BaseFlow {
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
     * Handle message input
     */
    async handleMessage(user: any, text: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handleStep', { text, session })

            // If no session, start search
            if (!session) {
                await this.startSearch(user, text)
                return
            }

            // Get current step
            const currentStep = session.step || 0
            console.log(`🔍 Current step: ${currentStep}`)

            // Route to appropriate step handler
            switch (currentStep) {
                case 0:
                    await this.handleKeywordStep(user, text)
                    break
                case 1:
                    await this.handleCategoryStep(user, text)
                    break
                case 2:
                    await this.handleLocationStep(user, text)
                    break
                default:
                    console.log(`❌ Unknown step: ${currentStep}`)
                    await this.sendErrorMessage(user.facebook_id)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleStep')
        }
    }

    /**
     * Handle postback events
     */
    async handlePostback(user: any, payload: string, session: any): Promise<void> {
        try {
            this.logActivity(user, 'handlePostback', { payload, session })

            if (payload === 'SEARCH') {
                // Start search flow by sending option buttons (no keyword input)
                await this.sendSearchOptions(user.facebook_id)
            } else if (payload === 'CATEGORY_SEARCH') {
                await this.startCategorySearch(user)
            } else if (payload === 'LOCATION_SEARCH') {
                await this.startLocationSearch(user)
            } else if (payload === 'SEARCH_ALL') {
                await this.performSearchAll(user)
            } else if (payload === 'QUICK_SEARCH') {
                await this.startQuickSearch(user)
            } else if (payload.startsWith('SELECT_CATEGORY_')) {
                await this.handleCategoryPostback(user, payload, session)
            } else if (payload.startsWith('SELECT_LOCATION_')) {
                await this.handleLocationPostback(user, payload, session)
            } else if (payload.startsWith('VIEW_LISTING_')) {
                await this.handleViewListingPostback(user, payload, session)
            } else if (payload.startsWith('SEARCH_SUGGESTION_')) {
                await this.handleSearchSuggestion(user, payload, session)
            } else if (payload.startsWith('QUICK_KEYWORD_')) {
                await this.handleQuickKeywordSearch(user, payload, session)
            } else if (payload.startsWith('CONTINUE_SEARCH_ALL_')) {
                await this.handleContinueSearchAll(user, payload, session)
            } else if (payload === 'CANCEL_SEARCH') {
                await this.cancelSearch(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

/**
 * Start search process - Button-only interface
 */
private async startSearch(user: any, keyword?: string): Promise<void> {
    try {
        console.log(`🔍 Starting button-only search for user: ${user.facebook_id}`)

        // Create new session without keyword dependency
        await SessionManager.createSession(user.facebook_id, 'search', 0, {})

        // Send enhanced search options with quick search buttons
        await this.sendEnhancedSearchOptions(user.facebook_id)

    } catch (error) {
        await this.handleError(user, error, 'startSearch')
    }
}

    /**
     * Handle keyword step
     */
    private async handleKeywordStep(user: any, text: string): Promise<void> {
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
     * Handle category step - Only show buttons, no text processing
     */
    private async handleCategoryStep(user: any, text: string): Promise<void> {
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
    private async handleLocationStep(user: any, text: string): Promise<void> {
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
     * Handle category postback
     */
    private async handleCategoryPostback(user: any, payload: string, session: any): Promise<void> {
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
    private async handleLocationPostback(user: any, payload: string, session: any): Promise<void> {
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
    private async handleViewListingPostback(user: any, payload: string, session: any): Promise<void> {
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
     * Perform search with enhanced keyword matching
     */
    private async performSearch(user: any): Promise<void> {
        try {
            console.log(`🔍 Performing enhanced search for user: ${user.facebook_id}`)

            // Get search criteria
            const searchData = await SessionManager.getSessionData(user.facebook_id)
            const { keyword, category, location } = searchData

            // Get all active listings
            const { supabaseAdmin } = await import('../../supabase')
            let query = supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')

            const { data: allListings, error: fetchError } = await query

            if (fetchError) {
                console.error('❌ Search error:', fetchError)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            if (!allListings || allListings.length === 0) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy sản phẩm nào phù hợp!')
                await this.cancelSearch(user)
                return
            }

            // Apply intelligent filtering using KEYWORDS_SYSTEM
            let filteredListings = allListings

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
                filteredListings = this.searchWithKeywords(filteredListings, keyword.trim())
            }

            // Limit results
            const finalListings = filteredListings.slice(0, 10)

            if (finalListings.length === 0) {
                await sendMessage(user.facebook_id,
                    `❌ Không tìm thấy sản phẩm nào phù hợp!\n━━━━━━━━━━━━━━━━━━━━\n💡 Thử tìm kiếm với từ khóa khác hoặc mở rộng vùng tìm kiếm`)
                await this.cancelSearch(user)
                return
            }

            // Send enhanced search results
            const searchSummary = this.generateSearchSummary(keyword, category, location, finalListings.length)
            await sendMessage(user.facebook_id, searchSummary)

            // Send listings as generic template with enhanced info
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
                await this.sendSearchSuggestions(user.facebook_id, keyword, category)
            }

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            console.log('✅ Enhanced search completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'performSearch')
        }
    }

    /**
     * Enhanced search with keyword system
     */
    private searchWithKeywords(listings: any[], keyword: string): any[] {
        // Use the enhanced search helpers from constants
        return SEARCH_HELPERS.searchWithHashtags(listings, keyword)
    }

    /**
     * Generate search summary message
     */
    private generateSearchSummary(keyword?: string, category?: string, location?: string, resultCount?: number): string {
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
    private async sendSearchSuggestions(facebookId: string, currentKeyword?: string, category?: string): Promise<void> {
        try {
            const suggestions = []

            // Suggest popular keywords
            if (currentKeyword) {
                const relatedKeywords = this.findRelatedKeywords(currentKeyword)
                suggestions.push(...relatedKeywords.slice(0, 3))
            }

            // Suggest related categories
            if (category) {
                const relatedCategories = this.findRelatedCategories(category)
                suggestions.push(...relatedCategories.slice(0, 2))
            }

            if (suggestions.length > 0) {
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
    private findRelatedKeywords(keyword: string): string[] {
        const related = []

        // Check popular keywords
        for (const popularKeyword of KEYWORDS_SYSTEM.POPULAR_KEYWORDS) {
            if (popularKeyword.includes(keyword) || keyword.includes(popularKeyword)) {
                related.push(popularKeyword)
            }
        }

        return related
    }

    /**
     * Find related categories for suggestions
     */
    private findRelatedCategories(category: string): string[] {
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
     * Cancel search
     */
    private async cancelSearch(user: any): Promise<void> {
        try {
            await SessionManager.deleteSession(user.facebook_id)
            await sendMessage(user.facebook_id, '❌ Đã hủy tìm kiếm. Chào tạm biệt!')
        } catch (error) {
            await this.handleError(user, error, 'cancelSearch')
        }
    }

    /**
     * Send category buttons
     */
    private async sendCategoryButtons(facebookId: string): Promise<void> {
        const quickReplies = Object.keys(CATEGORIES).map(category =>
            createQuickReply(category, `SELECT_CATEGORY_${category}`)
        )

        await sendQuickReply(facebookId, 'Chọn danh mục:', quickReplies)
    }

    /**
     * Send location buttons
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        const quickReplies = Object.keys(LOCATIONS).map(location =>
            createQuickReply(location, `SELECT_LOCATION_${location}`)
        )

        await sendQuickReply(facebookId, 'Chọn địa điểm:', quickReplies)
    }

    /**
     * Send enhanced search options with quick search buttons
     */
    private async sendEnhancedSearchOptions(facebookId: string): Promise<void> {
        try {
            console.log(`🔍 Sending enhanced search options for user: ${facebookId}`)

            // Send main search options
            await sendQuickReply(facebookId, '🔍 TÌM KIẾM SẢN PHẨM\n━━━━━━━━━━━━━━━━━━━━\nChọn cách tìm kiếm phù hợp:', [
                createQuickReply('📂 Theo danh mục', 'CATEGORY_SEARCH'),
                createQuickReply('📍 Theo địa điểm', 'LOCATION_SEARCH'),
                createQuickReply('🔍 Tìm tất cả', 'SEARCH_ALL'),
                createQuickReply('⚡ Tìm nhanh', 'QUICK_SEARCH')
            ])

        } catch (error) {
            await this.handleError({ facebook_id: facebookId }, error, 'sendEnhancedSearchOptions')
        }
    }

    /**
     * Send search options (button-only interface)
     */
    private async sendSearchOptions(facebookId: string): Promise<void> {
        try {
            console.log(`🔍 Sending search options for user: ${facebookId}`)

            // Create new session for search
            await SessionManager.createSession(facebookId, 'search', 0, {})

            // Send search options
            await sendQuickReply(facebookId, 'Chọn cách tìm kiếm:', [
                createQuickReply('📂 Theo danh mục', 'CATEGORY_SEARCH'),
                createQuickReply('📍 Theo địa điểm', 'LOCATION_SEARCH'),
                createQuickReply('🔍 Tìm tất cả', 'SEARCH_ALL')
            ])

        } catch (error) {
            await this.handleError({ facebook_id: facebookId }, error, 'sendSearchOptions')
        }
    }

    /**
     * Start category-based search
     */
    private async startCategorySearch(user: any): Promise<void> {
        try {
            console.log(`📂 Starting category search for user: ${user.facebook_id}`)

            // Create session starting from category step
            await SessionManager.createSession(user.facebook_id, 'search', 1, {})

            // Send category prompt
            await sendMessage(user.facebook_id,
                `📂 CHỌN DANH MỤC TÌM KIẾM\n━━━━━━━━━━━━━━━━━━━━\n💡 Chọn danh mục để tìm sản phẩm phù hợp\n━━━━━━━━━━━━━━━━━━━━`)

            // Send category buttons
            await this.sendCategoryButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'startCategorySearch')
        }
    }

    /**
     * Start location-based search
     */
    private async startLocationSearch(user: any): Promise<void> {
        try {
            console.log(`📍 Starting location search for user: ${user.facebook_id}`)

            // Create session starting from location step
            await SessionManager.createSession(user.facebook_id, 'search', 2, {})

            // Send location prompt
            await sendMessage(user.facebook_id,
                `📍 CHỌN ĐỊA ĐIỂM TÌM KIẾM\n━━━━━━━━━━━━━━━━━━━━\n💡 Chọn địa điểm để tìm sản phẩm gần bạn\n━━━━━━━━━━━━━━━━━━━━`)

            // Send location buttons
            await this.sendLocationButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'startLocationSearch')
        }
    }

    /**
     * Handle search suggestion postback
     */
    private async handleSearchSuggestion(user: any, payload: string, session: any): Promise<void> {
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
     * Start quick search with popular keywords
     */
    private async startQuickSearch(user: any): Promise<void> {
        try {
            console.log(`⚡ Starting quick search for user: ${user.facebook_id}`)

            // Send popular keywords for quick selection
            await sendQuickReply(user.facebook_id, '⚡ TÌM NHANH\n━━━━━━━━━━━━━━━━━━━━\nChọn từ khóa phổ biến:', [
                createQuickReply('🏠 Nhà đất', 'QUICK_KEYWORD_#nhadat'),
                createQuickReply('🚗 Ô tô xe máy', 'QUICK_KEYWORD_#oto'),
                createQuickReply('📱 Điện thoại', 'QUICK_KEYWORD_#dienthoai'),
                createQuickReply('💻 Laptop', 'QUICK_KEYWORD_#laptop'),
                createQuickReply('👨‍🏫 Gia sư', 'QUICK_KEYWORD_#giasu'),
                createQuickReply('💆 Massage', 'QUICK_KEYWORD_#massage'),
                createQuickReply('🍜 Món ăn', 'QUICK_KEYWORD_#monan'),
                createQuickReply('🏥 Y tế', 'QUICK_KEYWORD_#yte'),
                createQuickReply('👕 Thời trang', 'QUICK_KEYWORD_#quanao'),
                createQuickReply('🔧 Sửa chữa', 'QUICK_KEYWORD_#sua'),
                createQuickReply('📍 Hà Nội', 'QUICK_KEYWORD_#hanoi'),
                createQuickReply('🏙️ TP.HCM', 'QUICK_KEYWORD_#hcm')
            ])

        } catch (error) {
            await this.handleError(user, error, 'startQuickSearch')
        }
    }

    /**
     * Perform search all (no filters) - Enhanced version
     */
    private async performSearchAll(user: any): Promise<void> {
        try {
            console.log(`🔍 Performing enhanced search all for user: ${user.facebook_id}`)

            // Get all active listings with limit for performance
            const { supabaseAdmin } = await import('../../supabase')
            const { data: allListings, error: fetchError } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false }) // Latest first
                .limit(20) // Limit to prevent overload

            if (fetchError) {
                console.error('❌ Search all error:', fetchError)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            if (!allListings || allListings.length === 0) {
                await sendMessage(user.facebook_id, '❌ Hiện tại chưa có sản phẩm nào trong hệ thống!')
                await this.cancelSearch(user)
                return
            }

            // Send enhanced search results with better formatting
            await sendMessage(user.facebook_id,
                `🔍 TẤT CẢ SẢN PHẨM (${allListings.length} sản phẩm mới nhất)\n━━━━━━━━━━━━━━━━━━━━\n💡 Hiển thị các sản phẩm mới nhất trong hệ thống\n━━━━━━━━━━━━━━━━━━━━`)

            // Send listings in batches of 10 for better UX
            const batches = this.chunkArray(allListings, 10)

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const isLastBatch = i === batches.length - 1

                const elements = batch.map(listing =>
                    createGenericElement(
                        listing.title,
                        `${formatCurrency(listing.price)} • ${listing.location}${listing.category ? ` • ${listing.category}` : ''}`,
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

                // Add continue prompt for non-last batches
                if (!isLastBatch) {
                    await sendQuickReply(user.facebook_id,
                        `📊 Đã hiển thị ${Math.min((i + 1) * 10, allListings.length)}/${allListings.length} sản phẩm`,
                        [
                            createQuickReply('▶️ Tiếp tục xem', `CONTINUE_SEARCH_ALL_${i + 1}`),
                            createQuickReply('🔍 Tìm kiếm khác', 'SEARCH')
                        ]
                    )
                    break // Wait for user response before showing next batch
                }
            }

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            console.log('✅ Enhanced search all completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'performSearchAll')
        }
    }

    /**
     * Handle quick keyword search
     */
    private async handleQuickKeywordSearch(user: any, payload: string, session: any): Promise<void> {
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
    private async handleContinueSearchAll(user: any, payload: string, session: any): Promise<void> {
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

            // Calculate which batch to show
            const startIndex = batchIndex * 10
            const endIndex = Math.min(startIndex + 10, allListings.length)
            const batch = allListings.slice(startIndex, endIndex)
            const isLastBatch = endIndex >= allListings.length

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
                    `📊 Đã hiển thị ${endIndex}/${allListings.length} sản phẩm`,
                    [
                        createQuickReply('▶️ Tiếp tục xem', `CONTINUE_SEARCH_ALL_${batchIndex + 1}`),
                        createQuickReply('🔍 Tìm kiếm khác', 'SEARCH')
                    ]
                )
            } else {
                await sendMessage(user.facebook_id,
                    `✅ Đã hiển thị tất cả ${allListings.length} sản phẩm mới nhất`)
            }

        } catch (error) {
            await this.handleError(user, error, 'handleContinueSearchAll')
        }
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
