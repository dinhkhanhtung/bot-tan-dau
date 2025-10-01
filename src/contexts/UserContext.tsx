'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
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
  avatar_url?: string
  email?: string
  created_at: string
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isTrialExpired: boolean
  daysLeftInTrial: number
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  isTrialExpired: false,
  daysLeftInTrial: 0,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const refreshUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get user profile from database
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
          setUser(null)
        } else {
          setUser(userProfile)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await refreshUser()
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      toast.success('Đăng xuất thành công')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Lỗi đăng xuất')
    }
  }

  const isTrialExpired = user?.status === 'trial' && 
    user?.membership_expires_at && 
    new Date(user.membership_expires_at) < new Date()

  const daysLeftInTrial = user?.membership_expires_at ? 
    Math.ceil((new Date(user.membership_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      refreshUser,
      isTrialExpired,
      daysLeftInTrial
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
