// Test file for search functionality
import { SEARCH_HELPERS, CATEGORIES, LOCATIONS, HASHTAG_MAPPING, POPULAR_HASHTAGS } from './src/lib/constants'

console.log('=== TESTING SEARCH FUNCTIONALITY ===\n')

// Test 1: Category detection
console.log('1. Testing category detection:')
const testQueries = [
    'nhà ở hà nội',
    'xe honda city',
    'điện thoại iphone',
    'gia sư toán',
    'massage spa',
    'laptop dell'
]

testQueries.forEach(query => {
    const category = SEARCH_HELPERS.findCategoryByKeyword(query)
    const subcategory = SEARCH_HELPERS.findSubcategoryByKeyword(query)
    console.log(`  "${query}" -> Category: ${category || 'None'}, Subcategory: ${subcategory ? `${subcategory.category}/${subcategory.subcategory}` : 'None'}`)
})

// Test 2: Location detection
console.log('\n2. Testing location detection:')
const locationQueries = ['hà nội', 'hcm', 'đà nẵng', 'bình dương', 'đồng nai']
locationQueries.forEach(query => {
    const location = SEARCH_HELPERS.findLocationByKeyword(query)
    console.log(`  "${query}" -> ${location || 'Not found'}`)
})

// Test 3: Search suggestions
console.log('\n3. Testing search suggestions:')
const suggestionQueries = ['nhà', 'xe', 'dịch vụ', 'hà nội']
suggestionQueries.forEach(query => {
    const suggestions = SEARCH_HELPERS.generateSearchSuggestions(query)
    console.log(`  "${query}" -> ${suggestions.slice(0, 3).join(', ')}...`)
})

// Test 4: Parse search query
console.log('\n4. Testing query parsing:')
function parseSearchQuery(query: string) {
    const normalizedQuery = query.toLowerCase().trim()

    // Find category
    const category = SEARCH_HELPERS.findCategoryByKeyword(normalizedQuery)
    const categoryName = category ? CATEGORIES[category as keyof typeof CATEGORIES]?.name : null

    // Find location
    const location = SEARCH_HELPERS.findLocationByKeyword(normalizedQuery)

    // Extract keywords (remove category and location words)
    let keywords = normalizedQuery
    if (categoryName) {
        keywords = keywords.replace(categoryName.toLowerCase(), '').trim()
    }
    if (location) {
        keywords = keywords.replace(location.toLowerCase(), '').trim()
    }

    return {
        category,
        categoryName,
        location,
        keywords: keywords.split(' ').filter(k => k.length > 1)
    }
}

const complexQueries = [
    'nhà 3 tầng ở hà nội',
    'xe honda city 2020',
    'gia sư dạy toán tại tp.hồ chí minh',
    'massage thư giãn',
    'laptop dell inspiron'
]

complexQueries.forEach(query => {
    const parsed = parseSearchQuery(query)
    console.log(`  "${query}" -> Category: ${parsed.categoryName || 'None'}, Location: ${parsed.location || 'None'}, Keywords: [${parsed.keywords.join(', ')}]`)
})

// Test 5: Relevance scoring
console.log('\n5. Testing relevance scoring:')
const sampleItems = [
    { title: 'Nhà 3 tầng tại Ba Đình', description: 'Nhà đẹp, gần trung tâm', category: 'BẤT ĐỘNG SẢN', location: 'HÀ NỘI' },
    { title: 'Honda City 2020', description: 'Xe mới, ít sử dụng', category: 'Ô TÔ', location: 'TP.HỒ CHÍ MINH' },
    { title: 'iPhone 13 Pro Max', description: 'Điện thoại cao cấp', category: 'ĐIỆN TỬ', location: 'ĐÀ NẴNG' },
    { title: 'Dịch vụ gia sư toán', description: 'Dạy kèm toán cho học sinh', category: 'DỊCH VỤ', location: 'HÀ NỘI' }
]

const searchQuery = 'nhà'
sampleItems.forEach((item, index) => {
    const score = SEARCH_HELPERS.calculateRelevanceScore(item, searchQuery)
    console.log(`  Item ${index + 1}: "${item.title}" -> Score: ${score}`)
})

// Test 6: Simple search function
console.log('\n6. Testing simple search:')
const searchResults = SEARCH_HELPERS.searchListings(sampleItems, 'nhà')
console.log(`  Found ${searchResults.length} results for "nhà"`)
searchResults.forEach((item, index) => {
    console.log(`    ${index + 1}. "${item.title}" (Score: ${item.relevanceScore})`)
})

// Test 7: Hashtag functionality
console.log('\n7. Testing hashtag functionality:')
const hashtagTests = [
    '#quanao',
    '#dienthoai', 
    '#hanoi',
    '#re',
    '#moi'
]

hashtagTests.forEach(hashtag => {
    const mapping = SEARCH_HELPERS.getHashtagMapping(hashtag)
    const location = 'location' in mapping ? mapping.location : null
    console.log(`  ${hashtag} -> Category: ${mapping?.category || 'None'}, Location: ${location || 'None'}, Keywords: [${mapping?.keywords.join(', ') || 'None'}]`)
})

// Test 8: Hashtag parsing
console.log('\n8. Testing hashtag parsing:')
const hashtagQueryTests = [
    '#quanao áo sơ mi',
    '#dienthoai iphone 13',
    '#hanoi nhà 3 tầng',
    '#re #moi laptop',
    'xe honda #oto'
]

hashtagQueryTests.forEach(query => {
    const parsed = SEARCH_HELPERS.parseHashtags(query)
    console.log(`  "${query}" -> Hashtags: [${parsed.hashtags.join(', ')}], Remaining: "${parsed.remainingQuery}"`)
})

// Test 9: Popular hashtags
console.log('\n9. Testing popular hashtags:')
console.log(`  Popular hashtags: ${POPULAR_HASHTAGS.slice(0, 5).join(', ')}...`)

// Test 10: Hashtag search with sample data
console.log('\n10. Testing hashtag search:')
const hashtagSearchResults = SEARCH_HELPERS.searchWithHashtags(sampleItems, '#quanao')
console.log(`  Found ${hashtagSearchResults.length} results for "#quanao"`)

const hashtagLocationResults = SEARCH_HELPERS.searchWithHashtags(sampleItems, '#hanoi')
console.log(`  Found ${hashtagLocationResults.length} results for "#hanoi"`)

const hashtagCombinedResults = SEARCH_HELPERS.searchWithHashtags(sampleItems, '#dienthoai samsung')
console.log(`  Found ${hashtagCombinedResults.length} results for "#dienthoai samsung"`)

console.log('\n=== TEST COMPLETED ===')
