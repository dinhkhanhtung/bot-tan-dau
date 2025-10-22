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

            if (payload.startsWith('CATEGORY_')) {
                await this.handleCategoryPostback(user, payload, session)
            } else if (payload.startsWith('LOCATION_')) {
                await this.handleLocationPostback(user, payload, session)
            } else if (payload.startsWith('VIEW_LISTING_')) {
                await this.handleViewListingPostback(user, payload, session)
            } else if (payload === 'CANCEL_SEARCH') {
                await this.cancelSearch(user)
            }

        } catch (error) {
            await this.handleError(user, error, 'handlePostback')
        }
    }

    /**
     * Start search process
     */
    private async startSearch(user: any, keyword: string): Promise<void> {
        try {
            console.log(`🔍 Starting search for user: ${user.facebook_id}`)

            // Create new session
            await SessionManager.createSession(user.facebook_id, 'search', 0, {
                keyword: keyword.trim()
            })

            // No intro message - user already has buttons from welcome

            // Send search options
            await sendQuickReply(user.facebook_id, 'Chọn cách tìm kiếm:', [
                createQuickReply('📂 Theo danh mục', 'CATEGORY_SEARCH'),
                createQuickReply('📍 Theo địa điểm', 'LOCATION_SEARCH'),
                createQuickReply('🔍 Tìm tất cả', 'SEARCH_ALL')
            ])

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
     * Handle category step
     */
    private async handleCategoryStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📂 Processing category step for user: ${user.facebook_id}`)
            
            // For now, just show category buttons
            await this.sendCategoryButtons(user.facebook_id)

        } catch (error) {
            await this.handleError(user, error, 'handleCategoryStep')
        }
    }

    /**
     * Handle location step
     */
    private async handleLocationStep(user: any, text: string): Promise<void> {
        try {
            console.log(`📍 Processing location step for user: ${user.facebook_id}`)
            
            // For now, just show location buttons
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

            const category = payload.replace('CATEGORY_', '')
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

            const location = payload.replace('LOCATION_', '')
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
     * Perform search
     */
    private async performSearch(user: any): Promise<void> {
        try {
            console.log(`🔍 Performing search for user: ${user.facebook_id}`)

            // Get search criteria
            const searchData = await SessionManager.getSessionData(user.facebook_id)
            const { keyword, category, location } = searchData

            // Build search query
            const { supabaseAdmin } = await import('../../supabase')
            let query = supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')

            if (keyword) {
                query = query.ilike('title', `%${keyword}%`)
            }

            if (category) {
                query = query.eq('category', category)
            }

            if (location) {
                query = query.eq('location', location)
            }

            const { data: listings, error } = await query.limit(10)

            if (error) {
                console.error('❌ Search error:', error)
                await this.sendErrorMessage(user.facebook_id)
                return
            }

            if (!listings || listings.length === 0) {
                await sendMessage(user.facebook_id, '❌ Không tìm thấy sản phẩm nào phù hợp!')
                await this.cancelSearch(user)
                return
            }

            // Send search results
            await sendMessage(user.facebook_id, 
                `🔍 KẾT QUẢ TÌM KIẾM\n━━━━━━━━━━━━━━━━━━━━\n📊 Tìm thấy ${listings.length} sản phẩm\n━━━━━━━━━━━━━━━━━━━━`)

            // Send listings as generic template
            const elements = listings.map(listing => 
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

            // Clear session
            await SessionManager.deleteSession(user.facebook_id)

            console.log('✅ Search completed successfully')

        } catch (error) {
            await this.handleError(user, error, 'performSearch')
        }
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
            createQuickReply(category, `CATEGORY_${category}`)
        )

        await sendQuickReply(facebookId, 'Chọn danh mục:', quickReplies)
    }

    /**
     * Send location buttons
     */
    private async sendLocationButtons(facebookId: string): Promise<void> {
        const quickReplies = Object.keys(LOCATIONS).map(location => 
            createQuickReply(location, `LOCATION_${location}`)
        )

        await sendQuickReply(facebookId, 'Chọn địa điểm:', quickReplies)
    }
}
