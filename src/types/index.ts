// User Types
export interface User {
    id: string
    facebook_id: string
    name: string
    phone?: string
    location?: string
    birthday?: string
    status: 'trial' | 'active' | 'expired' | 'banned'
    membership_expires_at?: string
    rating: number
    total_transactions: number
    achievements: string[]
    referral_code: string
    created_at: string
    avatar_url?: string
    email?: string
}

export interface UserProfile extends User {
    is_online?: boolean
    last_seen?: string
    bio?: string
    website?: string
    social_links?: {
        facebook?: string
        instagram?: string
        twitter?: string
    }
}

// Listing Types
export interface Listing {
    id: string
    user_id: string
    type: 'product' | 'service'
    category: string
    title: string
    price?: number
    description?: string
    images: string[]
    status: 'active' | 'sold' | 'expired' | 'hidden'
    is_featured: boolean
    featured_until?: string
    created_at: string
    updated_at?: string
    view_count?: number
    like_count?: number
    user?: User
}

export interface ProductListing extends Listing {
    type: 'product'
    condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
    brand?: string
    model?: string
    year?: number
    color?: string
    size?: string
    weight?: number
    dimensions?: {
        length: number
        width: number
        height: number
    }
}

export interface ServiceListing extends Listing {
    type: 'service'
    service_type: string
    experience_years?: number
    price_type: 'hourly' | 'daily' | 'project' | 'consultation'
    availability?: {
        monday: boolean
        tuesday: boolean
        wednesday: boolean
        thursday: boolean
        friday: boolean
        saturday: boolean
        sunday: boolean
    }
    working_hours?: {
        start: string
        end: string
    }
    service_area?: string[]
    certifications?: string[]
}

// Chat Types
export interface Conversation {
    id: string
    user1: string
    user2: string
    listing_id?: string
    last_message_at: string
    created_at: string
    user1_profile?: User
    user2_profile?: User
    listing?: Listing
    unread_count?: number
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    message_type: 'text' | 'image' | 'file' | 'system'
    created_at: string
    updated_at?: string
    is_read: boolean
    sender?: User
    attachments?: MessageAttachment[]
}

export interface MessageAttachment {
    id: string
    message_id: string
    file_url: string
    file_name: string
    file_size: number
    file_type: string
    created_at: string
}

// Payment Types
export interface Payment {
    id: string
    user_id: string
    amount: number
    receipt_image?: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    approved_at?: string
    rejected_at?: string
    admin_notes?: string
    user?: User
}

export interface PaymentRequest {
    amount: number
    receipt_image?: File
    payment_method: 'bank_transfer' | 'momo' | 'zalopay'
    bank_account?: {
        account_number: string
        account_name: string
        bank_name: string
    }
}

// Rating Types
export interface Rating {
    id: string
    reviewer_id: string
    reviewee_id: string
    rating: number
    comment?: string
    created_at: string
    reviewer?: User
    reviewee?: User
}

// Event Types
export interface Event {
    id: string
    title: string
    description?: string
    event_date: string
    location?: string
    organizer_id: string
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
    created_at: string
    organizer?: User
    participants?: EventParticipant[]
    max_participants?: number
    registration_deadline?: string
    event_type: 'meetup' | 'webinar' | 'trading' | 'social'
}

export interface EventParticipant {
    id: string
    event_id: string
    user_id: string
    status: 'registered' | 'attended' | 'cancelled'
    registered_at: string
    user?: User
}

// Notification Types
export interface Notification {
    id: string
    user_id: string
    type: 'message' | 'listing' | 'payment' | 'rating' | 'event' | 'system'
    title: string
    message: string
    is_read: boolean
    created_at: string
    data?: Record<string, any>
}

// Achievement Types
export interface Achievement {
    id: string
    user_id: string
    achievement_type: string
    achieved_at: string
    user?: User
}

// Ad Types
export interface Ad {
    id: string
    user_id: string
    title: string
    description?: string
    image?: string
    target_locations: string[]
    target_categories: string[]
    budget: number
    status: 'pending' | 'active' | 'paused' | 'completed' | 'rejected'
    start_date?: string
    end_date?: string
    impressions: number
    clicks: number
    created_at: string
    user?: User
}

export interface AdPlacement {
    id: string
    ad_id: string
    placement_type: 'homepage_banner' | 'search_boost' | 'cross_sell' | 'featured_listing'
    position: number
    is_active: boolean
    created_at: string
    ad?: Ad
}

// Search Request Types
export interface SearchRequest {
    id: string
    user_id: string
    search_query: string
    category?: string
    location?: string
    budget_range?: string
    urgency: 'low' | 'medium' | 'high'
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    admin_notes?: string
    result_count: number
    price: number
    created_at: string
    user?: User
    results?: SearchResult[]
}

export interface SearchResult {
    id: string
    search_request_id: string
    listing_id: string
    match_score: number
    admin_notes?: string
    created_at: string
    listing?: Listing
}

// Referral Types
export interface Referral {
    id: string
    referrer_id: string
    referred_id: string
    status: 'pending' | 'completed' | 'cancelled'
    reward_amount: number
    reward_paid: boolean
    created_at: string
    referrer?: User
    referred?: User
}

// Analytics Types
export interface UserAnalytics {
    user_id: string
    total_listings: number
    total_connections: number
    response_rate: number
    avg_response_time: number
    conversion_rate: number
    revenue_generated: number
    last_activity: string
    updated_at: string
}

export interface PlatformAnalytics {
    total_users: number
    active_users: number
    trial_users: number
    total_listings: number
    active_listings: number
    total_conversations: number
    daily_revenue: number
    monthly_revenue: number
    conversion_rate: number
    retention_rate: number
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T = any> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
    }
}

// Form Types
export interface LoginForm {
    email: string
    password: string
    remember?: boolean
}

export interface RegisterForm {
    name: string
    email: string
    password: string
    confirmPassword: string
    phone?: string
    location?: string
    birthday?: string
    agreeTerms: boolean
}

export interface ListingForm {
    type: 'product' | 'service'
    category: string
    title: string
    description: string
    price?: number
    images: File[]
    // Product specific
    condition?: string
    brand?: string
    model?: string
    // Service specific
    service_type?: string
    experience_years?: number
    price_type?: string
    availability?: Record<string, boolean>
}

export interface SearchForm {
    query: string
    category?: string
    location?: string
    price_min?: number
    price_max?: number
    rating_min?: number
    sort_by?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating'
}

// Component Props Types
export interface BaseComponentProps {
    className?: string
    children?: React.ReactNode
}

export interface ButtonProps extends BaseComponentProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
    type?: 'button' | 'submit' | 'reset'
}

export interface InputProps extends BaseComponentProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
    disabled?: boolean
    required?: boolean
    error?: string
    label?: string
}

export interface CardProps extends BaseComponentProps {
    title?: string
    description?: string
    image?: string
    actions?: React.ReactNode
    hover?: boolean
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Status Types
export type UserStatus = 'trial' | 'active' | 'expired' | 'banned'
export type ListingStatus = 'active' | 'sold' | 'expired' | 'hidden'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type MessageType = 'text' | 'image' | 'file' | 'system'
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type AdStatus = 'pending' | 'active' | 'paused' | 'completed' | 'rejected'
export type SearchRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type ReferralStatus = 'pending' | 'completed' | 'cancelled'
