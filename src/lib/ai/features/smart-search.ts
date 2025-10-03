import { SearchContext, AIRequest, AIResponse } from '../types/ai-types'
import { BaseAIService } from '../core/ai-service'
import { supabaseAdmin } from '../../supabase'
import { SEARCH_HELPERS } from '../../constants'

// AI Smart Search - Tìm kiếm thông minh với NLP
export class SmartSearchService extends BaseAIService {
    constructor(config: any, fallbackStrategy: any) {
        super(config, fallbackStrategy)
    }

    getProviderName(): string {
        return 'smart_search'
    }

    getProviderType(): string {
        return 'search'
    }

    async generateResponse(request: AIRequest): Promise<AIResponse> {
        const startTime = Date.now()

        try {
            const searchContext = request.context as SearchContext
            const results = await this.performSmartSearch(searchContext)

            const response: AIResponse = {
                id: request.id,
                requestId: request.id,
                provider: request.provider,
                content: this.formatSearchResults(results, searchContext),
                timestamp: new Date(),
                success: true
            }

            // Log monitoring event
            this.logEvent({
                type: 'response',
                provider: request.provider,
                requestId: request.id,
                timestamp: new Date(),
                duration: Date.now() - startTime
            })

            return response

        } catch (error) {
            // Log error event
            this.logEvent({
                type: 'error',
                provider: request.provider,
                requestId: request.id,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                metadata: { error: (error as Error).message }
            })

            throw error
        }
    }

    isAvailable(): boolean {
        // Smart search luôn available vì có fallback
        return true
    }

    async getUsageStats(): Promise<any> {
        return {
            provider: this.getProviderName(),
            totalRequests: 0,
            successRate: 1.0,
            averageResponseTime: 0
        }
    }

    // Core smart search logic
    private async performSmartSearch(context: SearchContext): Promise<any[]> {
        const { query, category, location, priceRange } = context

        try {
            // Bước 1: Phân tích query với NLP cơ bản
            const searchIntent = this.analyzeSearchIntent(query)

            // Bước 2: Tìm kiếm trong database với smart matching
            let listings = await this.searchListingsWithNLP(query, category, location, priceRange)

            // Bước 3: Nếu không có kết quả, thử fuzzy search
            if (listings.length === 0) {
                listings = await this.fuzzySearchListings(query, category)
            }

            // Bước 4: Sắp xếp kết quả theo relevance
            const sortedListings = this.rankSearchResults(listings, searchIntent, query)

            // Bước 5: Lấy top 10 kết quả
            return sortedListings.slice(0, 10)

        } catch (error) {
            console.error('[SmartSearch] Error:', error)
            return []
        }
    }

    // Phân tích intent của search query
    private analyzeSearchIntent(query: string): {
        type: 'buy' | 'sell' | 'info' | 'general'
        urgency: 'high' | 'medium' | 'low'
        category?: string
        priceRange?: { min: number; max: number }
        location?: string
    } {
        const lowerQuery = query.toLowerCase()

        // Phân tích loại tìm kiếm
        let type: 'buy' | 'sell' | 'info' | 'general' = 'general'
        if (lowerQuery.includes('mua') || lowerQuery.includes('tìm') || lowerQuery.includes('cần')) {
            type = 'buy'
        } else if (lowerQuery.includes('bán') || lowerQuery.includes('ra') || lowerQuery.includes('cần bán')) {
            type = 'sell'
        } else if (lowerQuery.includes('thông tin') || lowerQuery.includes('hỏi') || lowerQuery.includes('tư vấn')) {
            type = 'info'
        }

        // Phân tích urgency
        let urgency: 'high' | 'medium' | 'low' = 'medium'
        if (lowerQuery.includes('gấp') || lowerQuery.includes('khẩn') || lowerQuery.includes('ngay')) {
            urgency = 'high'
        } else if (lowerQuery.includes('từ từ') || lowerQuery.includes('không gấp')) {
            urgency = 'low'
        }

        // Phân tích category từ query
        const category = SEARCH_HELPERS.findCategoryByKeyword(lowerQuery) || undefined

        // Phân tích price range
        const priceRange = this.extractPriceRange(query) || undefined

        // Phân tích location
        const location = SEARCH_HELPERS.findLocationByKeyword(lowerQuery) || undefined

        return { type, urgency, category, priceRange, location }
    }

    // Tìm kiếm listings với NLP
    private async searchListingsWithNLP(
        query: string,
        category?: string,
        location?: string,
        priceRange?: { min: number; max: number }
    ): Promise<any[]> {
        try {
            let dbQuery = supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(100)

            // Smart category matching
            if (category) {
                dbQuery = dbQuery.eq('category', category)
            }

            // Location matching với fuzzy search
            if (location) {
                dbQuery = dbQuery.ilike('location', `%${location}%`)
            }

            // Price range matching
            if (priceRange) {
                dbQuery = dbQuery
                    .gte('price', priceRange.min)
                    .lte('price', priceRange.max)
            }

            const { data: listings, error } = await dbQuery

            if (error) {
                console.error('[SmartSearch] DB Error:', error)
                return []
            }

            // Smart text matching với relevance scoring
            const scoredListings = listings.map(listing => ({
                ...listing,
                relevanceScore: this.calculateRelevanceScore(listing, query)
            }))

            // Lọc listings có relevance score > 0.1
            return scoredListings.filter(listing => listing.relevanceScore > 0.1)

        } catch (error) {
            console.error('[SmartSearch] Search Error:', error)
            return []
        }
    }

    // Fuzzy search khi không tìm thấy kết quả chính xác
    private async fuzzySearchListings(query: string, category?: string): Promise<any[]> {
        try {
            // Tách query thành keywords
            const keywords = query.toLowerCase()
                .split(' ')
                .filter(word => word.length > 1)
                .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))

            if (keywords.length === 0) return []

            // Tìm listings có chứa bất kỳ keyword nào
            const { data: listings, error } = await supabaseAdmin
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .or(keywords.map(keyword =>
                    `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
                ).join(','))
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) return []

            // Tính relevance score cho fuzzy results
            return listings.map(listing => ({
                ...listing,
                relevanceScore: this.calculateFuzzyRelevanceScore(listing, keywords)
            }))

        } catch (error) {
            console.error('[SmartSearch] Fuzzy Search Error:', error)
            return []
        }
    }

    // Tính relevance score cho search results
    private calculateRelevanceScore(listing: any, query: string): number {
        const lowerQuery = query.toLowerCase()
        const lowerTitle = listing.title.toLowerCase()
        const lowerDescription = listing.description.toLowerCase()

        let score = 0

        // Title match (trọng số cao nhất)
        if (lowerTitle.includes(lowerQuery)) {
            score += 0.5
        } else if (lowerTitle.split(' ').some((word: string) =>
            lowerQuery.split(' ').some((qWord: string) => word.includes(qWord) || qWord.includes(word))
        )) {
            score += 0.3
        }

        // Description match (trọng số trung bình)
        if (lowerDescription.includes(lowerQuery)) {
            score += 0.3
        }

        // Keyword matching
        const queryWords = lowerQuery.split(' ').filter(w => w.length > 2)
        queryWords.forEach(word => {
            if (lowerTitle.includes(word)) score += 0.1
            if (lowerDescription.includes(word)) score += 0.05
        })

        // Boost score cho listings mới
        const daysSinceCreated = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceCreated < 7) score += 0.1
        if (daysSinceCreated < 1) score += 0.1

        return Math.min(score, 1.0) // Max score = 1.0
    }

    // Tính relevance score cho fuzzy search
    private calculateFuzzyRelevanceScore(listing: any, keywords: string[]): number {
        const lowerTitle = listing.title.toLowerCase()
        const lowerDescription = listing.description.toLowerCase()

        let score = 0
        let matchedKeywords = 0

        keywords.forEach(keyword => {
            if (lowerTitle.includes(keyword) || lowerDescription.includes(keyword)) {
                matchedKeywords++
                score += 0.2
            }
        })

        // Bonus cho nhiều keywords match
        if (matchedKeywords > 1) {
            score += matchedKeywords * 0.1
        }

        return Math.min(score, 1.0)
    }

    // Sắp xếp kết quả theo relevance và freshness
    private rankSearchResults(listings: any[], intent: any, originalQuery: string): any[] {
        return listings.sort((a, b) => {
            // Relevance score (50% weight)
            const scoreA = a.relevanceScore || 0
            const scoreB = b.relevanceScore || 0
            const scoreDiff = scoreB - scoreA

            // Freshness score (30% weight)
            const freshnessA = this.calculateFreshnessScore(a.created_at)
            const freshnessB = this.calculateFreshnessScore(b.created_at)
            const freshnessDiff = freshnessB - freshnessA

            // Intent matching (20% weight)
            const intentA = this.calculateIntentMatch(a, intent)
            const intentB = this.calculateIntentMatch(b, intent)
            const intentDiff = intentB - intentA

            // Tổng weighted score
            const totalDiff = (scoreDiff * 0.5) + (freshnessDiff * 0.3) + (intentDiff * 0.2)

            return totalDiff
        })
    }

    // Tính freshness score
    private calculateFreshnessScore(createdAt: string): number {
        const now = Date.now()
        const created = new Date(createdAt).getTime()
        const hoursDiff = (now - created) / (1000 * 60 * 60)

        if (hoursDiff < 24) return 1.0      // Trong 24h
        if (hoursDiff < 72) return 0.8      // Trong 3 ngày
        if (hoursDiff < 168) return 0.6     // Trong 1 tuần
        if (hoursDiff < 720) return 0.4     // Trong 1 tháng
        return 0.2                          // Cũ hơn
    }

    // Tính intent matching score
    private calculateIntentMatch(listing: any, intent: any): number {
        let score = 0

        // Category match
        if (intent.category && listing.category === intent.category) {
            score += 0.3
        }

        // Location match
        if (intent.location && listing.location.toLowerCase().includes(intent.location.toLowerCase())) {
            score += 0.2
        }

        // Price range match
        if (intent.priceRange) {
            const { min, max } = intent.priceRange
            if (listing.price >= min && listing.price <= max) {
                score += 0.2
            }
        }

        // Urgency match (listings mới cho urgent queries)
        if (intent.urgency === 'high') {
            const hoursSinceCreated = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60)
            if (hoursSinceCreated < 48) score += 0.3
        }

        return Math.min(score, 1.0)
    }

    // Trích xuất price range từ query
    private extractPriceRange(query: string): { min: number; max: number } | null {
        const pricePatterns = [
            /dưới (\d+(?:\.\d+)?)\s*(triệu|tr|ty|tỷ)/gi,
            /từ (\d+(?:\.\d+)?)\s*(triệu|tr|ty|tỷ)?\s*đến (\d+(?:\.\d+)?)\s*(triệu|tr|ty|tỷ)/gi,
            /(\d+(?:\.\d+)?)\s*(triệu|tr|ty|tỷ)\s*trở xuống/gi,
            /trên (\d+(?:\.\d+)?)\s*(triệu|tr|ty|tỷ)/gi
        ]

        for (const pattern of pricePatterns) {
            const matches = query.match(pattern)
            if (matches) {
                const numbers = matches.map(match =>
                    parseFloat(match.replace(/[^\d.]/g, '')) || 0
                )

                if (numbers.length >= 2) {
                    return {
                        min: numbers[0] * 1000000, // Convert to VND
                        max: numbers[1] * 1000000
                    }
                } else if (numbers.length === 1) {
                    if (query.includes('dưới') || query.includes('trở xuống')) {
                        return { min: 0, max: numbers[0] * 1000000 }
                    } else if (query.includes('trên')) {
                        return { min: numbers[0] * 1000000, max: Number.MAX_SAFE_INTEGER }
                    }
                }
            }
        }

        return null
    }

    // Format kết quả search để hiển thị
    private formatSearchResults(listings: any[], context: SearchContext): string {
        if (listings.length === 0) {
            return this.generateNoResultsMessage(context)
        }

        let result = `🔍 Tìm thấy ${listings.length} kết quả cho "${context.query}"\n\n`

        listings.slice(0, 5).forEach((listing, index) => {
            result += `${index + 1}. ${listing.title}\n`
            result += `   💰 ${this.formatPrice(listing.price)}\n`
            result += `   📍 ${listing.location}\n`
            result += `   👤 Người đăng: ${listing.user_id.slice(-6)}\n`
            result += `   🏷️ Danh mục: ${listing.category}\n\n`
        })

        if (listings.length > 5) {
            result += `... và ${listings.length - 5} kết quả khác\n\n`
        }

        result += `💡 Mẹo: Sử dụng từ khóa cụ thể hơn để tìm chính xác hơn!`

        return result
    }

    // Format price hiển thị
    private formatPrice(price: number): string {
        if (price >= 1000000000) {
            return `${(price / 1000000000).toFixed(1)} tỷ`
        } else if (price >= 1000000) {
            return `${(price / 1000000).toFixed(0)} triệu`
        } else if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}k`
        }
        return price.toString()
    }

    // Tạo message khi không có kết quả
    private generateNoResultsMessage(context: SearchContext): string {
        let message = `🔍 Không tìm thấy kết quả nào cho "${context.query}"\n\n`

        message += `💡 Gợi ý tìm kiếm:\n`

        // Gợi ý dựa trên category
        if (context.category) {
            message += `• Tìm trong danh mục "${context.category}" với từ khóa khác\n`
        }

        // Gợi ý với từ khóa liên quan
        const suggestions = this.generateSearchSuggestions(context.query)
        suggestions.slice(0, 3).forEach(suggestion => {
            message += `• "${suggestion}"\n`
        })

        message += `\n🔧 Mẹo:`
        message += `\n• Kiểm tra lỗi chính tả`
        message += `\n• Sử dụng từ khóa ngắn gọn hơn`
        message += `\n• Bỏ điều kiện quá cụ thể`

        return message
    }

    // Tạo search suggestions
    private generateSearchSuggestions(query: string): string[] {
        const suggestions: string[] = []
        const words = query.toLowerCase().split(' ')

        // Thay thế từ khóa
        const replacements: Record<string, string[]> = {
            'nhà': ['căn hộ', 'biệt thự', 'nhà phố', 'đất nền'],
            'xe': ['ô tô', 'xe máy', 'xe đạp'],
            'điện thoại': ['smartphone', 'điện thoại cũ', 'iPhone', 'Samsung'],
            'laptop': ['máy tính', 'computer', 'MacBook'],
            'mua': ['tìm', 'cần mua', 'muốn mua'],
            'bán': ['ra', 'cần bán', 'muốn bán']
        }

        // Tạo suggestions bằng cách thay thế từ khóa
        words.forEach((word, index) => {
            const replacementWords = replacements[word]
            if (replacementWords) {
                replacementWords.forEach((replacement: string) => {
                    const newWords = [...words]
                    newWords[index] = replacement
                    suggestions.push(newWords.join(' '))
                })
            }
        })

        // Thêm suggestions bằng cách bỏ từ khóa
        if (words.length > 1) {
            suggestions.push(words.slice(1).join(' '))
            suggestions.push(words.slice(0, -1).join(' '))
        }

        // Loại bỏ duplicates và giới hạn số lượng
        const uniqueSuggestions = suggestions.filter((suggestion, index, arr) =>
            arr.indexOf(suggestion) === index && suggestion !== query
        )

        return uniqueSuggestions.slice(0, 5)
    }
}

// Export singleton instance
export const smartSearchService = new SmartSearchService({}, {})
