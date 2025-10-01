import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const createServerClient = () => {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Database types
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    facebook_id: string
                    name: string
                    phone: string | null
                    location: string | null
                    birthday: string | null
                    status: 'trial' | 'active' | 'expired' | 'banned'
                    membership_expires_at: string | null
                    rating: number
                    total_transactions: number
                    achievements: string[]
                    referral_code: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    facebook_id: string
                    name: string
                    phone?: string | null
                    location?: string | null
                    birthday?: string | null
                    status?: 'trial' | 'active' | 'expired' | 'banned'
                    membership_expires_at?: string | null
                    rating?: number
                    total_transactions?: number
                    achievements?: string[]
                    referral_code?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    facebook_id?: string
                    name?: string
                    phone?: string | null
                    location?: string | null
                    birthday?: string | null
                    status?: 'trial' | 'active' | 'expired' | 'banned'
                    membership_expires_at?: string | null
                    rating?: number
                    total_transactions?: number
                    achievements?: string[]
                    referral_code?: string
                    created_at?: string
                }
            }
            listings: {
                Row: {
                    id: string
                    user_id: string
                    type: 'product' | 'service'
                    category: string
                    title: string
                    price: number | null
                    description: string | null
                    images: string[]
                    status: 'active' | 'sold' | 'expired' | 'hidden'
                    is_featured: boolean
                    featured_until: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    type: 'product' | 'service'
                    category: string
                    title: string
                    price?: number | null
                    description?: string | null
                    images?: string[]
                    status?: 'active' | 'sold' | 'expired' | 'hidden'
                    is_featured?: boolean
                    featured_until?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    type?: 'product' | 'service'
                    category?: string
                    title?: string
                    price?: number | null
                    description?: string | null
                    images?: string[]
                    status?: 'active' | 'sold' | 'expired' | 'hidden'
                    is_featured?: boolean
                    featured_until?: string | null
                    created_at?: string
                }
            }
            conversations: {
                Row: {
                    id: string
                    user1: string
                    user2: string
                    listing_id: string | null
                    last_message_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user1: string
                    user2: string
                    listing_id?: string | null
                    last_message_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user1?: string
                    user2?: string
                    listing_id?: string | null
                    last_message_at?: string
                    created_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    user_id: string
                    amount: number
                    receipt_image: string | null
                    status: 'pending' | 'approved' | 'rejected'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    amount: number
                    receipt_image?: string | null
                    status?: 'pending' | 'approved' | 'rejected'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    amount?: number
                    receipt_image?: string | null
                    status?: 'pending' | 'approved' | 'rejected'
                    created_at?: string
                }
            }
        }
    }
}
