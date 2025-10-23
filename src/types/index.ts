// Database types
export interface User {
    id: string
    facebook_id: string
    name: string
    phone: string
    location: string
    birthday: number
    status: 'trial' | 'active' | 'expired' | 'suspended'
    membership_expires_at: string | null
    rating: number
    referral_code: string
    chat_mode: 'bot' | 'admin'
    created_at: string
    updated_at: string
}

export interface Listing {
    id: string
    user_id: string
    type: 'product' | 'service'
    category: string
    subcategory: string
    title: string
    price: number
    description: string
    images: string[]
    location: string
    status: 'active' | 'inactive' | 'sold' | 'pending'
    is_featured: boolean
    views: number
    created_at: string
    updated_at: string
}

export interface Conversation {
    id: string
    user1_id: string
    user2_id: string
    listing_id: string | null
    last_message_at: string
    created_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    message_type: 'text' | 'image' | 'file'
    created_at: string
}

export interface Payment {
    id: string
    user_id: string
    amount: number
    receipt_image: string | null
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    approved_at: string | null
}

export interface Rating {
    id: string
    reviewer_id: string
    reviewee_id: string
    rating: number
    comment: string | null
    created_at: string
}

export interface Event {
    id: string
    title: string
    description: string
    event_date: string
    location: string
    organizer_id: string
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
    max_participants: number | null
    current_participants: number
    created_at: string
}

export interface Notification {
    id: string
    user_id: string
    type: 'listing' | 'message' | 'birthday' | 'horoscope' | 'payment' | 'event' | 'ai_suggestion' | 'security'
    title: string
    message: string
    is_read: boolean
    created_at: string
}

export interface Ad {
    id: string
    user_id: string
    listing_id?: string
    ad_type: 'homepage_banner' | 'search_boost' | 'cross_sell_spot' | 'featured_listing'
    title: string
    description: string
    image: string | null
    budget: number
    daily_budget: number
    status: 'pending' | 'active' | 'paused' | 'completed' | 'rejected'
    start_date: string
    end_date: string
    priority: number
    target_category?: string
    target_location?: string
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
    created_at: string
    updated_at: string
}

export interface SearchRequest {
    id: string
    user_id: string
    search_query: string
    category: string
    location: string
    budget_range: string
    priority: 'low' | 'medium' | 'high'
    status: 'pending' | 'processing' | 'completed' | 'cancelled'
    price: number
    created_at: string
    completed_at: string | null
}

export interface Referral {
    id: string
    referrer_id: string
    referred_id: string
    status: 'pending' | 'completed' | 'cancelled'
    reward_amount: number
    reward_paid: boolean
    created_at: string
    completed_at: string | null
}

export interface UserPoints {
    id: string
    user_id: string
    points: number
    level: 'Đồng' | 'Bạc' | 'Vàng' | 'Bạch kim'
    streak_days: number
    last_activity_date: string | null
    created_at: string
    updated_at: string
}

export interface PointTransaction {
    id: string
    user_id: string
    points: number
    reason: string
    created_at: string
}

export interface BotSession {
    id: string
    user_id: string
    session_data: Record<string, any>
    current_flow: string | null
    current_step: number
    created_at: string
    updated_at: string
}

// Facebook Messenger types
export interface FacebookMessage {
    text?: string
    attachments?: FacebookAttachment[]
}

export interface FacebookAttachment {
    type: 'image' | 'file' | 'video' | 'audio'
    payload: {
        url: string
    }
}

export interface FacebookPostback {
    payload: string
}

export interface FacebookSender {
    id: string
}

export interface FacebookWebhookEvent {
    sender: FacebookSender
    message?: FacebookMessage
    postback?: FacebookPostback
    delivery?: any
    read?: any
}

// Bot flow types
export type BotFlow =
    | 'registration'
    | 'listing'
    | 'search'
    | 'payment'
    | 'community'
    | 'horoscope'
    | 'points'
    | 'settings'
    | 'support'
    | 'admin'

export type BotStep = number

// API Response types
export interface ApiResponse<T = any> {
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T = any> {
    data: T[]
    total: number
    page: number
    limit: number
    hasMore: boolean
}

// Form types
export interface RegistrationForm {
    name: string
    phone: string
    location: string
    birthday: number
}

export interface ListingForm {
    type: 'product' | 'service'
    category: string
    subcategory: string
    title: string
    price: number
    description: string
    images: string[]
    location: string
}

export interface SearchForm {
    category: string
    subcategory?: string
    location?: string
    minPrice?: number
    maxPrice?: number
    keyword?: string
}

export interface PaymentForm {
    amount: number
    receipt_image?: string
}

// Statistics types
export interface UserStats {
    total_listings: number
    active_listings: number
    sold_listings: number
    total_connections: number
    successful_connections: number
    average_rating: number
    total_revenue: number
    monthly_revenue: number
    weekly_revenue: number
}

export interface AdminStats {
    total_users: number
    active_users: number
    trial_users: number
    paid_users: number
    total_listings: number
    active_listings: number
    featured_listings: number
    total_connections: number
    daily_connections: number
    weekly_connections: number
    monthly_connections: number
    total_revenue: number
    daily_revenue: number
    weekly_revenue: number
    monthly_revenue: number
}

// AI-related types
export interface AITemplate {
    id: string
    admin_id: string
    name: string
    prompt: string
    tone: 'friendly' | 'professional' | 'casual'
    context: 'user_type' | 'situation' | 'goal'
    category: string
    is_active: boolean
    usage_count: number
    created_at: string
    updated_at: string
}

export interface AIAnalytics {
    id: string
    admin_id: string
    template_id?: string
    prompt: string
    response: string
    tone: string
    context: string
    model_used: string
    tokens_used: number
    response_time: number
    success: boolean
    error_message?: string
    created_at: string
}

export interface AIUsageStats {
    total_requests: number
    successful_requests: number
    failed_requests: number
    total_tokens: number
    average_response_time: number
    popular_templates: Array<{
        template_id: string
        name: string
        usage_count: number
    }>
    daily_usage: Array<{
        date: string
        requests: number
        tokens: number
    }>
}

export interface AIGenerateRequest {
    prompt: string
    tone: 'friendly' | 'professional' | 'casual'
    context: 'user_type' | 'situation' | 'goal'
    maxTokens?: number
    temperature?: number
    model?: 'openai' | 'google'
}

export interface AIGenerateResponse {
    response: string
    model_used: string
    tokens_used: number
    response_time: number
    metadata?: {
        tone: string
        context: string
        prompt_length: number
        response_length: number
    }
}

// AI Form types
export interface AIPromptForm {
    prompt: string
    tone: 'friendly' | 'professional' | 'casual'
    context: 'user_type' | 'situation' | 'goal'
    category: string
    templateName?: string
}

// User State Management Types
export enum UserType {
    ADMIN = 'admin',
    REGISTERED_USER = 'registered_user',
    TRIAL_USER = 'trial_user',
    PENDING_USER = 'pending_user',
    NEW_USER = 'new_user',
    EXPIRED_USER = 'expired_user'
}

export enum UserState {
    NEW_USER = 'new_user',
    CHOOSING = 'choosing',
    USING_BOT = 'using_bot',
    CHATTING_ADMIN = 'chatting_admin',
    IDLE = 'idle',
    IN_REGISTRATION = 'in_registration',
    IN_LISTING = 'in_listing',
    IN_SEARCH = 'in_search',
    IN_PAYMENT = 'in_payment'
}

export interface UserStateData {
    facebook_id: string
    current_mode: UserState
    user_type: UserType
    last_mode_change: string
    mode_change_count: number
    bot_active: boolean
    welcome_sent: boolean
    last_interaction: string
    last_welcome_sent?: string
    interaction_count: number
    preferences?: Record<string, any>
    created_at: string
    updated_at: string
}

export interface UserContext {
    userType: UserType
    userState: UserState
    user: any
    session: any
    isInFlow: boolean
    flowType?: string
}

export interface UserPermissions {
    canUseBot: boolean
    canSearch: boolean
    canViewListings: boolean
    canCreateListings: boolean
    canContactSellers: boolean
    canMakePayments: boolean
    canUseAdminChat: boolean
    canAccessCommunity: boolean
    canUsePoints: boolean
    canAccessSettings: boolean
    maxListingsPerDay?: number
    maxSearchesPerDay?: number
    maxMessagesPerDay?: number
}

// Permission definitions for each user type
export const USER_PERMISSIONS: Record<UserType, UserPermissions> = {
    [UserType.ADMIN]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 999,
        maxSearchesPerDay: 999,
        maxMessagesPerDay: 999
    },
    [UserType.REGISTERED_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 10,
        maxSearchesPerDay: 50,
        maxMessagesPerDay: 100
    },
    [UserType.TRIAL_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: true,
        canContactSellers: true,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: true,
        canUsePoints: true,
        canAccessSettings: true,
        maxListingsPerDay: 5,
        maxSearchesPerDay: 20,
        maxMessagesPerDay: 50
    },
    [UserType.PENDING_USER]: {
        canUseBot: true,
        canSearch: true,
        canViewListings: true,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: false,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 10,
        maxMessagesPerDay: 20
    },
    [UserType.NEW_USER]: {
        canUseBot: false,
        canSearch: false,
        canViewListings: false,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: false,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 0,
        maxMessagesPerDay: 5
    },
    [UserType.EXPIRED_USER]: {
        canUseBot: false,
        canSearch: false,
        canViewListings: false,
        canCreateListings: false,
        canContactSellers: false,
        canMakePayments: true,
        canUseAdminChat: true,
        canAccessCommunity: false,
        canUsePoints: false,
        canAccessSettings: false,
        maxListingsPerDay: 0,
        maxSearchesPerDay: 0,
        maxMessagesPerDay: 5
    }
}

// AI Dashboard integration types
export interface AIDashboardStats {
    today_requests: number
    weekly_requests: number
    monthly_requests: number
    total_templates: number
    active_templates: number
    average_response_time: number
    success_rate: number
}

// Admin Role-based Access Control Types
export enum AdminRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
    VIEWER = 'viewer'
}

export enum AdminPermission {
    // User Management
    VIEW_USERS = 'view_users',
    EDIT_USERS = 'edit_users',
    DELETE_USERS = 'delete_users',
    SUSPEND_USERS = 'suspend_users',

    // Listing Management
    VIEW_LISTINGS = 'view_listings',
    EDIT_LISTINGS = 'edit_listings',
    DELETE_LISTINGS = 'delete_listings',
    APPROVE_LISTINGS = 'approve_listings',

    // Payment Management
    VIEW_PAYMENTS = 'view_payments',
    APPROVE_PAYMENTS = 'approve_payments',
    REJECT_PAYMENTS = 'reject_payments',

    // Analytics & Reports
    VIEW_ANALYTICS = 'view_analytics',
    EXPORT_DATA = 'export_data',

    // System Administration
    MANAGE_ADMINS = 'manage_admins',
    SYSTEM_SETTINGS = 'system_settings',
    VIEW_LOGS = 'view_logs',

    // Communication
    SEND_NOTIFICATIONS = 'send_notifications',
    BULK_OPERATIONS = 'bulk_operations',

    // AI Management
    MANAGE_AI_TEMPLATES = 'manage_ai_templates',
    VIEW_AI_ANALYTICS = 'view_ai_analytics'
}

export interface AdminPermissions {
    role: AdminRole
    permissions: AdminPermission[]
    restrictions?: {
        maxUsersPerAction?: number
        allowedCategories?: string[]
        timeRestrictions?: {
            startHour: number
            endHour: number
        }
    }
}

export interface AdminUser {
    id: string
    username: string
    email: string
    name: string
    role: AdminRole
    permissions: AdminPermission[]
    isActive: boolean
    lastLogin?: string
    createdAt: string
    updatedAt: string
    createdBy?: string
}

// Role-based permission definitions
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
    [AdminRole.SUPER_ADMIN]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.EDIT_USERS,
        AdminPermission.DELETE_USERS,
        AdminPermission.SUSPEND_USERS,
        AdminPermission.VIEW_LISTINGS,
        AdminPermission.EDIT_LISTINGS,
        AdminPermission.DELETE_LISTINGS,
        AdminPermission.APPROVE_LISTINGS,
        AdminPermission.VIEW_PAYMENTS,
        AdminPermission.APPROVE_PAYMENTS,
        AdminPermission.REJECT_PAYMENTS,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.EXPORT_DATA,
        AdminPermission.MANAGE_ADMINS,
        AdminPermission.SYSTEM_SETTINGS,
        AdminPermission.VIEW_LOGS,
        AdminPermission.SEND_NOTIFICATIONS,
        AdminPermission.BULK_OPERATIONS,
        AdminPermission.MANAGE_AI_TEMPLATES,
        AdminPermission.VIEW_AI_ANALYTICS
    ],
    [AdminRole.ADMIN]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.EDIT_USERS,
        AdminPermission.SUSPEND_USERS,
        AdminPermission.VIEW_LISTINGS,
        AdminPermission.EDIT_LISTINGS,
        AdminPermission.APPROVE_LISTINGS,
        AdminPermission.VIEW_PAYMENTS,
        AdminPermission.APPROVE_PAYMENTS,
        AdminPermission.REJECT_PAYMENTS,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.EXPORT_DATA,
        AdminPermission.SEND_NOTIFICATIONS,
        AdminPermission.BULK_OPERATIONS,
        AdminPermission.VIEW_AI_ANALYTICS
    ],
    [AdminRole.MODERATOR]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_LISTINGS,
        AdminPermission.EDIT_LISTINGS,
        AdminPermission.APPROVE_LISTINGS,
        AdminPermission.VIEW_PAYMENTS,
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.SEND_NOTIFICATIONS
    ],
    [AdminRole.VIEWER]: [
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_LISTINGS,
        AdminPermission.VIEW_PAYMENTS,
        AdminPermission.VIEW_ANALYTICS
    ]
}

// Helper function to check if admin has permission
export const hasPermission = (adminRole: AdminRole, permission: AdminPermission): boolean => {
    return ROLE_PERMISSIONS[adminRole]?.includes(permission) || false
}

// Helper function to get role display name
export const getRoleDisplayName = (role: AdminRole): string => {
    const roleNames = {
        [AdminRole.SUPER_ADMIN]: 'Super Admin',
        [AdminRole.ADMIN]: 'Admin',
        [AdminRole.MODERATOR]: 'Moderator',
        [AdminRole.VIEWER]: 'Viewer'
    }
    return roleNames[role] || role
}
