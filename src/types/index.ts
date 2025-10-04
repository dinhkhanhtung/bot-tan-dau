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
    title: string
    description: string
    image: string | null
    budget: number
    status: 'pending' | 'active' | 'paused' | 'completed'
    start_date: string
    end_date: string
    created_at: string
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
