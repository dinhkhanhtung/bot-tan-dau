import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

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
