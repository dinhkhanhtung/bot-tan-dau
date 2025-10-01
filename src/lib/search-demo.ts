// Demo file showing how to use the simple search features (No AI - Cost Effective)
import { SEARCH_HELPERS, CATEGORIES, LOCATIONS, DISTRICTS } from './constants'

// Example usage of simple search helpers
export function demonstrateSearchFeatures() {
    console.log('=== SIMPLE SEARCH DEMO (No AI) ===\n')

    // 1. Find category by keyword
    console.log('1. Finding categories by keywords:')
    const keywords = ['nhà', 'xe hơi', 'điện thoại', 'gia sư', 'massage']
    keywords.forEach(keyword => {
        const category = SEARCH_HELPERS.findCategoryByKeyword(keyword)
        console.log(`  "${keyword}" -> ${category || 'Not found'}`)
    })

    console.log('\n2. Finding subcategories by keywords:')
    const subKeywords = ['honda city', 'iphone', 'yoga', 'lập trình']
    subKeywords.forEach(keyword => {
        const result = SEARCH_HELPERS.findSubcategoryByKeyword(keyword)
        console.log(`  "${keyword}" -> ${result ? `${result.category}/${result.subcategory}` : 'Not found'}`)
    })

    console.log('\n3. Finding locations by keyword:')
    const locationKeywords = ['hà nội', 'hcm', 'đà nẵng', 'hải phòng']
    locationKeywords.forEach(keyword => {
        const location = SEARCH_HELPERS.findLocationByKeyword(keyword)
        console.log(`  "${keyword}" -> ${location || 'Not found'}`)
    })

    console.log('\n4. Getting districts for major cities:')
    const majorCities = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'ĐÀ NẴNG', 'BÌNH DƯƠNG']
    majorCities.forEach(city => {
        const districts = SEARCH_HELPERS.getDistrictsForProvince(city)
        console.log(`  ${city}: ${districts.length} districts`)
        console.log(`    Examples: ${districts.slice(0, 3).join(', ')}...`)
    })

    console.log('\n5. Checking major cities:')
    const testLocations = ['HÀ NỘI', 'TP.HỒ CHÍ MINH', 'BÌNH DƯƠNG', 'NGHỆ AN']
    testLocations.forEach(location => {
        const isMajor = SEARCH_HELPERS.isMajorCity(location)
        console.log(`  ${location}: ${isMajor ? 'Major City' : 'Province'}`)
    })

    console.log('\n6. Generating search suggestions:')
    const queries = ['nhà', 'xe', 'dịch vụ', 'hà nội']
    queries.forEach(query => {
        const suggestions = SEARCH_HELPERS.generateSearchSuggestions(query)
        console.log(`  "${query}" -> ${suggestions.slice(0, 5).join(', ')}...`)
    })

    console.log('\n7. Calculating relevance scores:')
    const sampleItems = [
        { title: 'Nhà 3 tầng tại Ba Đình', description: 'Nhà đẹp, gần trung tâm', category: 'BẤT ĐỘNG SẢN', location: 'HÀ NỘI' },
        { title: 'Honda City 2020', description: 'Xe mới, ít sử dụng', category: 'Ô TÔ', location: 'TP.HỒ CHÍ MINH' },
        { title: 'iPhone 13 Pro Max', description: 'Điện thoại cao cấp', category: 'ĐIỆN TỬ', location: 'ĐÀ NẴNG' }
    ]

    const searchQuery = 'nhà'
    sampleItems.forEach((item, index) => {
        const score = SEARCH_HELPERS.calculateRelevanceScore(item, searchQuery)
        console.log(`  Item ${index + 1}: "${item.title}" -> Score: ${score}`)
    })

    console.log('\n8. Category statistics:')
    Object.entries(CATEGORIES).forEach(([key, category]) => {
        const keywordCount = category.keywords?.length || 0
        const subcategoryCount = category.subcategories.length
        console.log(`  ${category.name}: ${subcategoryCount} subcategories, ${keywordCount} keywords`)
    })

    console.log('\n9. Location statistics:')
    console.log(`  Total provinces/cities: ${LOCATIONS.length}`)
    console.log(`  Major cities with districts: ${Object.keys(DISTRICTS).length}`)

    console.log('\n10. Popular search terms:')
    const popularTerms = SEARCH_HELPERS.getPopularSearchTerms()
    console.log(`  ${popularTerms.join(', ')}`)
}

// Simple search function (no AI - cost effective)
export function simpleSearch(query: string, items: any[]): any[] {
    console.log(`\n=== SIMPLE SEARCH: "${query}" ===`)

    // Use the simple search helper
    const results = SEARCH_HELPERS.searchListings(items, query)

    console.log(`Found ${results.length} relevant items out of ${items.length} total`)

    // Show top results
    results.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.title}" (Score: ${item.relevanceScore})`)
    })

    return results
}

// Example usage
if (require.main === module) {
    demonstrateSearchFeatures()

    // Example advanced search
    const sampleItems = [
        { title: 'Nhà 3 tầng tại Ba Đình', description: 'Nhà đẹp, gần trung tâm', category: 'BẤT ĐỘNG SẢN', location: 'HÀ NỘI' },
        { title: 'Honda City 2020', description: 'Xe mới, ít sử dụng', category: 'Ô TÔ', location: 'TP.HỒ CHÍ MINH' },
        { title: 'iPhone 13 Pro Max', description: 'Điện thoại cao cấp', category: 'ĐIỆN TỬ', location: 'ĐÀ NẴNG' },
        { title: 'Dịch vụ gia sư toán', description: 'Dạy kèm toán cho học sinh', category: 'DỊCH VỤ', location: 'HÀ NỘI' },
        { title: 'Massage thư giãn', description: 'Dịch vụ massage chuyên nghiệp', category: 'DỊCH VỤ', location: 'TP.HỒ CHÍ MINH' }
    ]

    simpleSearch('nhà', sampleItems)
    simpleSearch('dịch vụ', sampleItems)
    simpleSearch('hà nội', sampleItems)
}
