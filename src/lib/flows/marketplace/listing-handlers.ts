import { BaseFlow } from '../../core/flow-base'
import { SessionManager } from '../../core/session-manager'
import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../../facebook-api'
import { formatCurrency } from '@/lib/formatters'
import { generateId } from '../../generators'
import { CATEGORIES, LOCATIONS, KEYWORDS_SYSTEM } from '../../constants'
import { logger } from '../../logger'

/**
 * Listing Handlers - Handles postback events and step processing for listing flow
 */
export class ListingHandlers extends BaseFlow {
    readonly flowName = 'listing'

    /**
     * Check if this flow can handle the user/session
     */
    canHandle(user: any, session: any): boolean {
        // Handle null user case
        if (!user || !user.status) {
            return false
        }

        // Can handle if user is registered and wants to create listing
        return (user.status === 'registered' || user.status === 'trial' || (session?.current_flow === 'listing' && session?.step === undefined)) &&
            (session?.current_flow === 'listing' || !session)
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
                step: 3,
                data: {
                    ...currentData,
                    category: category
                }
            })

            // Send title prompt
            await sendMessage(user.facebook_id,
                `✅ Danh mục: ${category}\n━━━━━━━━━━━━━━━━━━━━\n📝 Bước 3/6: Tiêu đề sản phẩm\n💡 Nhập tiêu đề ngắn gọn, hấp dẫn cho sản phẩm\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập tiêu đề:`)

            console.log('✅ Category step completed, moved to title step')

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
                step: 5,
                data: {
                    ...currentData,
                    location: location
                }
            })

            // Complete listing
            await this.completeListing(user)

        } catch (error) {
            await this.handleError(user, error, 'handleLocationPostback')
        }
    }

    /**
     * Handle keywords selection step
     */
    async handleKeywordsStep(user: any, text: string): Promise<void> {
        try {
            console.log(`🔑 Processing keywords step for user: ${user.facebook_id}`)

            // Update session with keywords
            await SessionManager.updateSession(user.facebook_id, {
                step: 1,
                data: { keywords: text.trim() }
            })

            // Send category prompt
            await sendMessage(user.facebook_id,
                `✅ Từ khóa: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📂 Bước 2/6: Danh mục sản phẩm\n💡 Chọn danh mục phù hợp với sản phẩm của bạn\n━━━━━━━━━━━━━━━━━━━━`)

            // Send category buttons
            await this.sendCategoryButtons(user.facebook_id)

            console.log('✅ Keywords step completed, moved to category step')

        } catch (error) {
            await this.handleError(user, error, 'handleKeywordsStep')
        }
    }

    /**
     * Handle title input step
     */
    async handleTitleStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📝 Processing title step for user: ${user.facebook_id}`)

            // Validate title
            if (!super.validateInput(text, 5)) {
                await sendMessage(user.facebook_id, '❌ Tiêu đề quá ngắn. Vui lòng nhập ít nhất 5 ký tự!')
                return
            }

            // Update session with title
            await SessionManager.updateSession(user.facebook_id, {
                step: 2,
                data: { title: text.trim() }
            })

            // Send category prompt
            await sendMessage(user.facebook_id,
                `✅ Tiêu đề: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📂 Bước 3/6: Danh mục sản phẩm\n💡 Chọn danh mục phù hợp với sản phẩm của bạn\n━━━━━━━━━━━━━━━━━━━━`)

            // Send category buttons
            await this.sendCategoryButtons(user.facebook_id)

            console.log('✅ Title step completed, moved to category step')

        } catch (error) {
            await this.handleError(user, error, 'handleTitleStep')
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
     * Handle price step
     */
    async handlePriceStep(user: any, text: string): Promise<void> {
        try {
            console.log(`💰 Processing price step for user: ${user.facebook_id}`)

            // Clean price input
            const priceText = text.replace(/[^\d]/g, '')
            const price = parseInt(priceText)

            if (!price || price < 1000) {
                await sendMessage(user.facebook_id, '❌ Giá không hợp lệ! Vui lòng nhập giá từ 1,000 VNĐ trở lên.')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with price
            await SessionManager.updateSession(user.facebook_id, {
                step: 3,
                data: {
                    ...currentData,
                    price: price
                }
            })

            // Send description prompt
            await sendMessage(user.facebook_id,
                `✅ Giá: ${formatCurrency(price)}\n━━━━━━━━━━━━━━━━━━━━\n📝 Bước 4/5: Mô tả sản phẩm\n💡 Mô tả chi tiết về sản phẩm của bạn\n━━━━━━━━━━━━━━━━━━━━\nVui lòng nhập mô tả sản phẩm:`)

            console.log('✅ Price step completed, moved to description step')

        } catch (error) {
            await this.handleError(user, error, 'handlePriceStep')
        }
    }

    /**
     * Handle description step
     */
    async handleDescriptionStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📝 Processing description step for user: ${user.facebook_id}`)

            // Validate description
            if (!super.validateInput(text, 10)) {
                await sendMessage(user.facebook_id, '❌ Mô tả quá ngắn. Vui lòng nhập ít nhất 10 ký tự!')
                return
            }

            // Get current session data
            const currentData = await SessionManager.getSessionData(user.facebook_id)

            // Update session with description
            await SessionManager.updateSession(user.facebook_id, {
                step: 4,
                data: {
                    ...currentData,
                    description: text.trim()
                }
            })

            // Send location prompt
            await sendMessage(user.facebook_id,
                `✅ Mô tả: ${text.trim()}\n━━━━━━━━━━━━━━━━━━━━\n📍 Bước 5/5: Địa điểm\n💡 Chọn nơi bạn đang ở để người mua dễ tìm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send location buttons
            await this.sendLocationButtons(user.facebook_id)

            console.log('✅ Description step completed, moved to location step')

        } catch (error) {
            await this.handleError(user, error, 'handleDescriptionStep')
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
     * Complete listing process
     */
    async completeListing(user: any): Promise<void> {
        try {
            console.log(`🎉 Completing listing for user: ${user.facebook_id}`)

            // Get session data
            const sessionData = await SessionManager.getSessionData(user.facebook_id)
            const { title, category, price, description, location } = sessionData

            // Create listing in database
            const { supabaseAdmin } = await import('../../supabase')
            const { error: listingError } = await supabaseAdmin
                .from('listings')
                .insert({
                    id: generateId(),
                    user_id: user.facebook_id,
                    title: title,
                    category: category,
                    price: price,
                    description: description,
                    location: location,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (listingError) {
                console.error('❌ Listing creation error:', listingError)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            // Send success message
            await sendMessage(user.facebook_id,
                `🎉 ĐĂNG TIN THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━\n✅ Tiêu đề: ${title}\n✅ Danh mục: ${category}\n✅ Giá: ${formatCurrency(price)}\n✅ Địa điểm: ${location}\n━━━━━━━━━━━━━━━━━━━━\n📢 Tin đăng của bạn đã được duyệt và hiển thị!\n💡 Người mua có thể liên hệ với bạn qua tin nhắn.`)

            console.log('✅ Listing completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'completeListing')
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
            await sendQuickReply(facebookId, 'Chọn danh mục sản phẩm:', quickReplies)
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
                        createQuickReply('▶️ Xem thêm', `NEXT_LISTING_CATEGORIES_${i + 1}`)
                    )
                }

                // Add back button if not the first batch
                if (!isFirstBatch) {
                    quickReplies.push(
                        createQuickReply('◀️ Quay lại', `PREV_LISTING_CATEGORIES_${i - 1}`)
                    )
                }

                const batchMessage = isFirstBatch
                    ? `Chọn danh mục sản phẩm (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), categories.length)}/${categories.length}):`
                    : `Danh mục sản phẩm (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), categories.length)}/${categories.length}):`

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
            // Split locations into batches
            const batches = this.chunkArray(locations, maxButtons - 2) // Reserve 2 slots for navigation buttons

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const isLastBatch = i === batches.length - 1
                const isFirstBatch = i === 0

                const quickReplies = batch.map(location =>
                    createQuickReply(location, `SELECT_LOCATION_${location}`)
                )

                // Add navigation buttons if not the last batch
                if (!isLastBatch) {
                    quickReplies.push(
                        createQuickReply('▶️ Xem thêm', `NEXT_LISTING_LOCATIONS_${i + 1}`)
                    )
                }

                // Add back button if not the first batch
                if (!isFirstBatch) {
                    quickReplies.push(
                        createQuickReply('◀️ Quay lại', `PREV_LISTING_LOCATIONS_${i - 1}`)
                    )
                }

                const batchMessage = isFirstBatch
                    ? `Chọn địa điểm (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), locations.length)}/${locations.length}):`
                    : `Địa điểm (${i * (maxButtons - 2) + 1}-${Math.min((i + 1) * (maxButtons - 2), locations.length)}/${locations.length}):`

                await sendQuickReply(facebookId, batchMessage, quickReplies)

                // If this is the first batch and there are more, stop here and wait for user input
                if (isFirstBatch && !isLastBatch) {
                    break
                }
            }
        }
    }

    /**
     * Send keywords buttons
     */
    async sendKeywordsButtons(facebookId: string): Promise<void> {
        const quickReplies = KEYWORDS_SYSTEM.POPULAR_KEYWORDS.slice(0, 10).map(keyword =>
            createQuickReply(keyword, `LISTING_KEYWORD_${keyword}`)
        )

        // Add "Khác" option for custom input
        quickReplies.push(createQuickReply('🔍 Từ khóa khác', 'LISTING_KEYWORD_CUSTOM'))

        await sendQuickReply(facebookId, 'Chọn từ khóa sản phẩm:', quickReplies)
    }

    /**
     * Send category-specific keywords
     */
    async sendCategoryKeywordsButtons(facebookId: string, category: string): Promise<void> {
        const categoryKeywords = KEYWORDS_SYSTEM.CATEGORIES_KEYWORDS[category as keyof typeof KEYWORDS_SYSTEM.CATEGORIES_KEYWORDS]

        if (!categoryKeywords) {
            await this.sendKeywordsButtons(facebookId)
            return
        }

        const quickReplies = [
            ...categoryKeywords.primary.slice(0, 8).map(keyword =>
                createQuickReply(keyword, `LISTING_KEYWORD_${keyword}`)
            ),
            createQuickReply('🔙 Từ khóa phổ biến', 'LISTING_KEYWORD_POPULAR'),
            createQuickReply('🔍 Từ khóa khác', 'LISTING_KEYWORD_CUSTOM')
        ]

        await sendQuickReply(facebookId, `Từ khóa cho ${category}:`, quickReplies)
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

    /**
     * Handle next categories page
     */
    async handleNextListingCategories(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`▶️ Processing next listing categories for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('NEXT_LISTING_CATEGORIES_', ''))
            console.log(`[DEBUG] Next listing categories page: ${pageIndex}`)

            await this.sendListingCategoriesPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handleNextListingCategories')
        }
    }

    /**
     * Handle previous categories page
     */
    async handlePrevListingCategories(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`◀️ Processing previous listing categories for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('PREV_LISTING_CATEGORIES_', ''))
            console.log(`[DEBUG] Previous listing categories page: ${pageIndex}`)

            await this.sendListingCategoriesPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handlePrevListingCategories')
        }
    }

    /**
     * Send categories page with pagination
     */
    async sendListingCategoriesPage(facebookId: string, pageIndex: number): Promise<void> {
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
                createQuickReply('▶️ Xem thêm', `NEXT_LISTING_CATEGORIES_${pageIndex + 1}`)
            )
        }

        if (!isFirstPage) {
            quickReplies.push(
                createQuickReply('◀️ Quay lại', `PREV_LISTING_CATEGORIES_${pageIndex - 1}`)
            )
        }

        const pageMessage = `Danh mục sản phẩm (${startIndex + 1}-${endIndex}/${categories.length}):`

        await sendQuickReply(facebookId, pageMessage, quickReplies)
    }

    /**
     * Handle next locations page for listing flow
     */
    async handleNextListingLocations(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`▶️ Processing next listing locations for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('NEXT_LISTING_LOCATIONS_', ''))
            console.log(`[DEBUG] Next listing locations page: ${pageIndex}`)

            await this.sendListingLocationsPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handleNextListingLocations')
        }
    }

    /**
     * Handle previous locations page for listing flow
     */
    async handlePrevListingLocations(user: any, payload: string, session: any): Promise<void> {
        try {
            console.log(`◀️ Processing previous listing locations for user: ${user.facebook_id}`)

            const pageIndex = parseInt(payload.replace('PREV_LISTING_LOCATIONS_', ''))
            console.log(`[DEBUG] Previous listing locations page: ${pageIndex}`)

            await this.sendListingLocationsPage(user.facebook_id, pageIndex)

        } catch (error) {
            await this.handleError(user, error, 'handlePrevListingLocations')
        }
    }

    /**
     * Send locations page with pagination for listing flow
     */
    async sendListingLocationsPage(facebookId: string, pageIndex: number): Promise<void> {
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
                createQuickReply('▶️ Xem thêm', `NEXT_LISTING_LOCATIONS_${pageIndex + 1}`)
            )
        }

        if (!isFirstPage) {
            quickReplies.push(
                createQuickReply('◀️ Quay lại', `PREV_LISTING_LOCATIONS_${pageIndex - 1}`)
            )
        }

        const pageMessage = `Địa điểm (${startIndex + 1}-${endIndex}/${locations.length}):`

        await sendQuickReply(facebookId, pageMessage, quickReplies)
    }
}
