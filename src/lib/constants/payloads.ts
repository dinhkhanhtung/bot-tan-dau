/**
 * Payload Constants - Tập trung quản lý tất cả Quick Reply Payload
 * Đảm bảo tính nhất quán và dễ bảo trì
 */

export const PAYLOADS = {
  // Core Actions - Các hành động chính
  SEARCH: 'SEARCH',
  LISTING: 'LISTING',
  REGISTER: 'REGISTER',
  INFO: 'INFO',
  CONTACT_ADMIN: 'CONTACT_ADMIN',

  // Search Actions - Các hành động tìm kiếm
  SEARCH_ALL: 'SEARCH_ALL',
  CATEGORY_SEARCH: 'CATEGORY_SEARCH',
  LOCATION_SEARCH: 'LOCATION_SEARCH',
  QUICK_SEARCH: 'QUICK_SEARCH',

  // Category & Location Selection - Chuẩn hóa naming
  // Dùng chung prefix cho cả search và listing để nhất quán
  SELECT_CATEGORY: 'SELECT_CATEGORY_',
  SELECT_LOCATION: 'SELECT_LOCATION_',

  // Quick Keywords - Từ khóa nhanh
  QUICK_KEYWORD: 'QUICK_KEYWORD_',

  // View & Contact Actions
  VIEW_LISTING: 'VIEW_LISTING_',
  CONTACT_SELLER: 'CONTACT_SELLER_',

  // Continue Actions
  CONTINUE_SEARCH_ALL: 'CONTINUE_SEARCH_ALL_',

  // Search Suggestions
  SEARCH_SUGGESTION: 'SEARCH_SUGGESTION_',

  // Cancel Actions - Hủy các hành động
  CANCEL_SEARCH: 'CANCEL_SEARCH',
  CANCEL_LISTING: 'CANCEL_LISTING',
  CANCEL_COMMUNITY: 'CANCEL_COMMUNITY',
  CANCEL_REGISTRATION: 'CANCEL_REGISTRATION',

  // Registration Actions
  REG_BIRTHDAY_YES: 'REG_BIRTHDAY_YES',
  REG_BIRTHDAY_NO: 'REG_BIRTHDAY_NO',
  LOC_SHOW_MORE: 'LOC_SHOW_MORE',

  // System Actions - Các hành động hệ thống
  EXIT_BOT: 'EXIT_BOT',
  CHAT_BOT: 'CHAT_BOT',
  WAIT_30_MIN: 'WAIT_30_MIN',
  MAIN_MENU: 'MAIN_MENU',
  RETRY: 'RETRY',
  BACK_TO_MAIN: 'BACK_TO_MAIN',

  // User Mode Actions - Chế độ sử dụng
  USE_BOT: 'USE_BOT',
  CHAT_ADMIN: 'CHAT_ADMIN',
  STOP_BOT: 'STOP_BOT',

  // Community Actions
  COMMUNITY: 'COMMUNITY',

  // Payment Actions
  PAYMENT: 'PAYMENT',
  UPGRADE: 'UPGRADE',
  RENEW: 'RENEW',

  // Legacy Payloads - Để tương thích ngược (sẽ loại bỏ dần)
  // @deprecated - Sử dụng PAYLOADS.SEARCH thay thế
  SEARCH_PRODUCTS: 'SEARCH_PRODUCTS',

  // @deprecated - Sử dụng PAYLOADS.CONTACT_ADMIN thay thế
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',

  // @deprecated - Sử dụng PAYLOADS.INFO thay thế
  GET_HELP: 'GET_HELP',
} as const

/**
 * Helper functions để tạo payload động
 */
export const PayloadHelpers = {
  /**
   * Tạo payload cho category selection
   */
  createCategoryPayload: (category: string): string => {
    return `${PAYLOADS.SELECT_CATEGORY}${category}`
  },

  /**
   * Tạo payload cho location selection
   */
  createLocationPayload: (location: string): string => {
    return `${PAYLOADS.SELECT_LOCATION}${location}`
  },

  /**
   * Tạo payload cho quick keyword
   */
  createQuickKeywordPayload: (keyword: string): string => {
    return `${PAYLOADS.QUICK_KEYWORD}${keyword}`
  },

  /**
   * Tạo payload cho view listing
   */
  createViewListingPayload: (listingId: string): string => {
    return `${PAYLOADS.VIEW_LISTING}${listingId}`
  },

  /**
   * Tạo payload cho contact seller
   */
  createContactSellerPayload: (sellerId: string): string => {
    return `${PAYLOADS.CONTACT_SELLER}${sellerId}`
  },

  /**
   * Tạo payload cho continue search all
   */
  createContinueSearchAllPayload: (batchIndex: number): string => {
    return `${PAYLOADS.CONTINUE_SEARCH_ALL}${batchIndex}`
  },

  /**
   * Tạo payload cho search suggestion
   */
  createSearchSuggestionPayload: (suggestion: string): string => {
    return `${PAYLOADS.SEARCH_SUGGESTION}${suggestion}`
  },
}

/**
 * Mapping các payload cũ sang payload mới để tương thích ngược
 */
export const PAYLOAD_MAPPINGS = {
  // Search mappings
  'SEARCH_PRODUCTS': PAYLOADS.SEARCH,
  'SUPPORT_ADMIN': PAYLOADS.CONTACT_ADMIN,
  'GET_HELP': PAYLOADS.INFO,

  // Category mappings - chuẩn hóa từ LISTING_CATEGORY sang SELECT_CATEGORY
  'LISTING_CATEGORY_': PAYLOADS.SELECT_CATEGORY,
  'SEARCH_CATEGORY_': PAYLOADS.SELECT_CATEGORY,

  // Location mappings - chuẩn hóa từ LISTING_LOCATION sang SELECT_LOCATION
  'LISTING_LOCATION_': PAYLOADS.SELECT_LOCATION,
  'SEARCH_LOCATION_': PAYLOADS.SELECT_LOCATION,
} as const

/**
 * Kiểm tra payload có hợp lệ không
 */
export const isValidPayload = (payload: string): boolean => {
  // Kiểm tra payload chính xác
  const exactMatch = Object.values(PAYLOADS).includes(payload as any)
  if (exactMatch) return true

  // Kiểm tra payload động (có prefix)
  const dynamicPayloads = [
    PAYLOADS.SELECT_CATEGORY,
    PAYLOADS.SELECT_LOCATION,
    PAYLOADS.QUICK_KEYWORD,
    PAYLOADS.VIEW_LISTING,
    PAYLOADS.CONTACT_SELLER,
    PAYLOADS.CONTINUE_SEARCH_ALL,
    PAYLOADS.SEARCH_SUGGESTION,
  ]

  return dynamicPayloads.some(dynamicPayload =>
    payload.startsWith(dynamicPayload)
  )
}

/**
 * Chuẩn hóa payload (chuyển payload cũ sang payload mới)
 */
export const normalizePayload = (payload: string): string => {
  // Kiểm tra mapping trực tiếp
  const directMapping = PAYLOAD_MAPPINGS[payload as keyof typeof PAYLOAD_MAPPINGS]
  if (directMapping) {
    return directMapping
  }

  // Kiểm tra mapping prefix
  for (const [oldPrefix, newPrefix] of Object.entries(PAYLOAD_MAPPINGS)) {
    if (payload.startsWith(oldPrefix)) {
      return payload.replace(oldPrefix, newPrefix)
    }
  }

  // Trả về payload gốc nếu không có mapping
  return payload
}

export default PAYLOADS
