/**
 * Shared Flow Utilities
 * Common utilities for all flow operations to eliminate duplication
 */

import {
    sendMessage,
    sendQuickReply,
    createQuickReply,
    sendGenericTemplate,
    createGenericElement
} from '../../facebook-api'
import { formatCurrency } from '../../formatters'
import { CATEGORIES, LOCATIONS } from '../../constants'
import { logger } from '../../logger'

// Common button creation utilities
export class ButtonUtils {
    /**
     * Create category selection buttons with pagination
     */
    static async sendCategoryButtons(facebookId: string, pageIndex: number = 0): Promise<void> {
        const categories = Object.keys(CATEGORIES)
        const maxButtons = 13 // Facebook API limit for quick replies

        if (categories.length <= maxButtons) {
            // Send all categories in one message
            const quickReplies = categories.map(category =>
                createQuickReply(category, `SELECT_CATEGORY_${category}`)
            )
            await sendQuickReply(facebookId, 'Chọn danh mục:', quickReplies)
        } else {
            // Send paginated categories
            await this.sendCategoriesPage(facebookId, pageIndex)
        }
    }

    /**
     * Create location selection buttons with pagination
     */
    static async sendLocationButtons(facebookId: string, pageIndex: number = 0): Promise<void> {
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
            await this.sendLocationsPage(facebookId, pageIndex)
        }
    }

    /**
     * Send categories page with pagination
     */
    static async sendCategoriesPage(facebookId: string, pageIndex: number): Promise<void> {
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
     * Send locations page with pagination
     */
    static async sendLocationsPage(facebookId: string, pageIndex: number): Promise<void> {
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
     * Create pagination navigation buttons
     */
    static createPaginationButtons(currentPage: number, totalPages: number, prefix: string): any[] {
        const buttons = []

        if (currentPage > 1) {
            buttons.push(createQuickReply('⬅️ Trang trước', `${prefix}_PREV`))
        }

        if (currentPage < totalPages) {
            buttons.push(createQuickReply('➡️ Trang sau', `${prefix}_NEXT`))
        }

        return buttons
    }

    /**
     * Create common action buttons
     */
    static createActionButtons(actions: Array<{ title: string, payload: string }>): any[] {
        return actions.map(action => createQuickReply(action.title, action.payload))
    }
}

// Common message formatting utilities
export class MessageUtils {
    /**
     * Format step progress message
     */
    static formatStepMessage(currentStep: number, totalSteps: number, title: string, description?: string): string {
        let message = `📝 Bước ${currentStep}/${totalSteps}: ${title}`

        if (description) {
            message += `\n💡 ${description}`
        }

        return message
    }

    /**
     * Format selection confirmation message
     */
    static formatSelectionMessage(selectedValue: string, nextStep: string): string {
        return `✅ ${selectedValue}\n━━━━━━━━━━━━━━━━━━━━\n${nextStep}`
    }

    /**
     * Format search results summary
     */
    static formatSearchSummary(keyword?: string, category?: string, location?: string, resultCount?: number): string {
        let summary = `🔍 KẾT QUẢ TÌM KIẾM\n━━━━━━━━━━━━━━━━━━━━\n`

        if (keyword) summary += `🔑 Từ khóa: ${keyword}\n`
        if (category) summary += `📂 Danh mục: ${category}\n`
        if (location) summary += `📍 Địa điểm: ${location}\n`

        summary += `━━━━━━━━━━━━━━━━━━━━\n`
        summary += `📊 Tìm thấy ${resultCount || 0} sản phẩm\n`
        summary += `━━━━━━━━━━━━━━━━━━━━`

        return summary
    }

    /**
     * Format listing display
     */
    static formatListingDisplay(listing: any): { title: string, subtitle: string } {
        return {
            title: listing.title,
            subtitle: `${formatCurrency(listing.price)} • ${listing.location}${listing.category ? ` • ${listing.category}` : ''}`
        }
    }

    /**
     * Format error message with context
     */
    static formatErrorMessage(error: string, context?: any): string {
        let message = `❌ ${error}`

        if (context) {
            message += `\n📝 Chi tiết: ${JSON.stringify(context)}`
        }

        return message
    }
}

// Common session management utilities
export class SessionUtils {
    /**
     * Update session step and data
     */
    static async updateSessionStep(facebookId: string, step: number, data: any): Promise<void> {
        const { SessionManager } = await import('../../core/session-manager')
        await SessionManager.updateSession(facebookId, {
            step,
            data: { ...data }
        })
    }

    /**
     * Get current session data
     */
    static async getSessionData(facebookId: string): Promise<any> {
        const { SessionManager } = await import('../../core/session-manager')
        return await SessionManager.getSessionData(facebookId)
    }

    /**
     * Clear session
     */
    static async clearSession(facebookId: string): Promise<void> {
        const { SessionManager } = await import('../../core/session-manager')
        await SessionManager.deleteSession(facebookId)
    }
}

// Common listing utilities
export class ListingUtils {
    /**
     * Create listing display elements
     */
    static createListingElements(listings: any[]): any[] {
        return listings.map(listing => {
            const { title, subtitle } = MessageUtils.formatListingDisplay(listing)

            return createGenericElement(
                title,
                subtitle,
                undefined, // No image for now
                [
                    {
                        type: 'postback',
                        title: '👁️ Xem chi tiết',
                        payload: `VIEW_LISTING_${listing.id}`
                    }
                ]
            )
        })
    }

    /**
     * Filter valid listings
     */
    static filterValidListings(listings: any[]): any[] {
        return listings.filter(listing =>
            listing.title &&
            listing.price != null &&
            listing.location &&
            typeof listing.price === 'number' &&
            !isNaN(listing.price)
        )
    }

    /**
     * Send listings with pagination
     */
    static async sendListingsWithPagination(
        facebookId: string,
        listings: any[],
        itemsPerPage: number = 10,
        pageIndex: number = 0
    ): Promise<void> {
        const validListings = this.filterValidListings(listings)
        const startIndex = pageIndex * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, validListings.length)
        const pageListings = validListings.slice(startIndex, endIndex)

        if (pageListings.length === 0) {
            await sendMessage(facebookId, '❌ Không có sản phẩm nào để hiển thị!')
            return
        }

        const elements = this.createListingElements(pageListings)
        await sendGenericTemplate(facebookId, elements)

        // Send pagination info if there are more results
        if (validListings.length > itemsPerPage) {
            const totalPages = Math.ceil(validListings.length / itemsPerPage)
            const paginationMessage = `📊 Hiển thị ${endIndex}/${validListings.length} sản phẩm`

            if (pageIndex < totalPages - 1) {
                await sendQuickReply(facebookId, paginationMessage, [
                    createQuickReply('▶️ Xem tiếp', `NEXT_LISTINGS_${pageIndex + 1}`),
                    createQuickReply('🔍 Tìm kiếm khác', 'SEARCH')
                ])
            } else {
                await sendMessage(facebookId, `✅ ${paginationMessage} - Đã hiển thị tất cả`)
            }
        }
    }
}

// Common error handling utilities
export class ErrorUtils {
    /**
     * Handle flow errors consistently
     */
    static async handleFlowError(user: any, error: any, operation: string): Promise<void> {
        logger.error(`Flow error in ${operation}`, {
            facebookId: user.facebook_id,
            error: error instanceof Error ? error.message : String(error)
        })

        try {
            await sendMessage(user.facebook_id, '❌ Có lỗi xảy ra. Vui lòng thử lại sau!')
        } catch (sendError) {
            logger.error('Failed to send error message', { sendError })
        }
    }

    /**
     * Send error message with context
     */
    static async sendErrorMessage(facebookId: string, context?: any): Promise<void> {
        const errorMessage = context
            ? MessageUtils.formatErrorMessage('Có lỗi xảy ra', context)
            : '❌ Có lỗi xảy ra. Vui lòng thử lại sau!'

        await sendMessage(facebookId, errorMessage)
    }
}

// Common validation utilities
export class ValidationUtils {
    /**
     * Validate email format
     */
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    /**
     * Validate required text input
     */
    static validateRequiredText(text: string, minLength: number = 1): boolean {
        return Boolean(text && text.trim().length >= minLength)
    }

    /**
     * Validate step input
     */
    static validateStepInput(input: string, expectedType: 'text' | 'number' | 'selection'): boolean {
        switch (expectedType) {
            case 'text':
                return this.validateRequiredText(input, 1)
            case 'number':
                return !isNaN(Number(input))
            case 'selection':
                return input.length > 0
            default:
                return false
        }
    }

    /**
     * Validate phone number format - use centralized validator
     */
    static async validatePhoneNumber(phone: string): Promise<boolean> {
        const { validatePhoneNumber: validatePhone } = await import('../../validators')
        return validatePhone(phone)
    }
}

// Common flow state management
export class FlowStateUtils {
    /**
     * Check if user is in specific flow
     */
    static async isInFlow(facebookId: string, flowName: string): Promise<boolean> {
        const { SessionManager } = await import('../../core/session-manager')
        const session = await SessionManager.getSession(facebookId)
        return session?.current_flow === flowName
    }

    /**
     * Get current flow step
     */
    static async getCurrentStep(facebookId: string): Promise<number> {
        const { SessionManager } = await import('../../core/session-manager')
        const session = await SessionManager.getSession(facebookId)
        return session?.step || 0
    }

    /**
     * Move to next step
     */
    static async moveToNextStep(facebookId: string, data?: any): Promise<void> {
        const currentStep = await this.getCurrentStep(facebookId)
        await SessionUtils.updateSessionStep(facebookId, currentStep + 1, data || {})
    }

    /**
     * Reset flow to specific step
     */
    static async resetToStep(facebookId: string, step: number, data?: any): Promise<void> {
        await SessionUtils.updateSessionStep(facebookId, step, data || {})
    }
}

// Common search utilities
export class SearchUtils {
    /**
     * Get listings from database with filters
     */
    static async getListingsWithFilters(filters: {
        keyword?: string
        category?: string
        location?: string
        limit?: number
    } = {}): Promise<any[]> {
        const { supabaseAdmin } = await import('../../supabase')
        let query = supabaseAdmin
            .from('listings')
            .select('*')
            .eq('status', 'active')

        if (filters.keyword) {
            query = query.ilike('title', `%${filters.keyword}%`)
        }

        if (filters.category) {
            query = query.eq('category', filters.category)
        }

        if (filters.location) {
            query = query.eq('location', filters.location)
        }

        if (filters.limit) {
            query = query.limit(filters.limit)
        }

        const { data: listings, error } = await query

        if (error) {
            logger.error('Error fetching listings', { filters, error })
            return []
        }

        return listings || []
    }

    /**
     * Process search results
     */
    static async processSearchResults(
        facebookId: string,
        listings: any[],
        searchCriteria?: { keyword?: string, category?: string, location?: string }
    ): Promise<void> {
        if (!listings || listings.length === 0) {
            await sendMessage(facebookId, '❌ Không tìm thấy sản phẩm nào phù hợp!')
            return
        }

        const validListings = ListingUtils.filterValidListings(listings)

        if (validListings.length === 0) {
            await sendMessage(facebookId, '❌ Không tìm thấy sản phẩm hợp lệ nào!')
            return
        }

        // Send search summary
        const summary = MessageUtils.formatSearchSummary(
            searchCriteria?.keyword,
            searchCriteria?.category,
            searchCriteria?.location,
            validListings.length
        )
        await sendMessage(facebookId, summary)

        // Send listings
        await ListingUtils.sendListingsWithPagination(facebookId, validListings)
    }
}

// Common array utilities
export class ArrayUtils {
    /**
     * Chunk array into smaller arrays
     */
    static chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize))
        }
        return chunks
    }

    /**
     * Paginate array
     */
    static paginateArray<T>(array: T[], page: number, itemsPerPage: number): {
        items: T[]
        totalPages: number
        currentPage: number
        hasNext: boolean
        hasPrev: boolean
    } {
        const totalItems = array.length
        const totalPages = Math.ceil(totalItems / itemsPerPage)
        const startIndex = (page - 1) * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
        const items = array.slice(startIndex, endIndex)

        return {
            items,
            totalPages,
            currentPage: page,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    }
}

// Common navigation utilities
export class NavigationUtils {
    /**
     * Handle category navigation
     */
    static async handleCategoryNavigation(
        facebookId: string,
        payload: string,
        direction: 'next' | 'prev'
    ): Promise<void> {
        const pageIndex = parseInt(payload.replace(/NEXT_CATEGORIES_|PREV_CATEGORIES_/g, '')) || 0
        const newPageIndex = direction === 'next' ? pageIndex + 1 : Math.max(0, pageIndex - 1)

        await ButtonUtils.sendCategoriesPage(facebookId, newPageIndex)
    }

    /**
     * Handle location navigation
     */
    static async handleLocationNavigation(
        facebookId: string,
        payload: string,
        direction: 'next' | 'prev'
    ): Promise<void> {
        const pageIndex = parseInt(payload.replace(/NEXT_LOCATIONS_|PREV_LOCATIONS_/g, '')) || 0
        const newPageIndex = direction === 'next' ? pageIndex + 1 : Math.max(0, pageIndex - 1)

        await ButtonUtils.sendLocationsPage(facebookId, newPageIndex)
    }

    /**
     * Handle listing navigation
     */
    static async handleListingNavigation(
        facebookId: string,
        payload: string,
        listings: any[]
    ): Promise<void> {
        const pageIndex = parseInt(payload.replace('NEXT_LISTINGS_', '')) || 0
        await ListingUtils.sendListingsWithPagination(facebookId, listings, 10, pageIndex)
    }
}

// All utilities are already exported as classes above
