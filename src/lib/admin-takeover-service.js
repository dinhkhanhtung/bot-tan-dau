/**
 * Admin Takeover Service - JavaScript version for testing
 * Simplified version for testing purposes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export class AdminTakeoverService {
    static async getTakeoverState(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error getting takeover state', { userId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            console.error('Exception getting takeover state', { userId, error })
            return null
        }
    }

    static async updateTakeoverState(userId, updates) {
        try {
            const { error } = await supabaseAdmin
                .from('admin_takeover_states')
                .upsert({
                    user_id: userId,
                    ...updates,
                    updated_at: new Date().toISOString()
                })

            if (error) {
                console.error('Error updating takeover state', { userId, updates, error: error.message })
            }
        } catch (error) {
            console.error('Exception updating takeover state', { userId, error })
        }
    }

    static async handleConsecutiveUserMessages(userId, message) {
        try {
            console.log('Handling consecutive user message', { userId, messageLength: message.length })

            const currentState = await this.getTakeoverState(userId)

            const now = new Date()
            const lastMessageTime = currentState?.last_user_message_at ?
                new Date(currentState.last_user_message_at) : null

            const isConsecutive = lastMessageTime &&
                (now.getTime() - lastMessageTime.getTime()) < 5 * 60 * 1000

            let newCount = 1
            if (isConsecutive && currentState) {
                newCount = (currentState.consecutive_message_count || 0) + 1
            }

            await this.updateTakeoverState(userId, {
                consecutive_message_count: newCount,
                last_user_message_at: now.toISOString(),
                is_active: false
            })

            console.log('Updated message count', {
                userId,
                newCount,
                isConsecutive,
                threshold: 2
            })

            if (newCount >= 2) {
                console.log('User needs admin support', { userId, messageCount: newCount })

                await this.updateTakeoverState(userId, {
                    user_waiting_for_admin: true
                })

                return true
            }

            return false
        } catch (error) {
            console.error('Error handling consecutive user messages', { userId, error })
            return false
        }
    }

    static async initiateAdminTakeover(userId, adminId) {
        try {
            console.log('Initiating admin takeover', { userId, adminId })

            await this.updateTakeoverState(userId, {
                admin_id: adminId,
                is_active: true,
                takeover_started_at: new Date().toISOString(),
                user_waiting_for_admin: false
            })

            await supabaseAdmin
                .from('admin_chat_sessions')
                .upsert({
                    user_facebook_id: userId,
                    admin_id: adminId,
                    is_active: true,
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            console.log('Admin takeover initiated successfully', { userId, adminId })
        } catch (error) {
            console.error('Error initiating admin takeover', { userId, adminId, error })
        }
    }

    static async isAdminActive(userId) {
        try {
            const state = await this.getTakeoverState(userId)
            return state?.is_active || false
        } catch (error) {
            console.error('Exception checking admin status', { userId, error })
            return false
        }
    }

    static async getUsersWaitingForAdmin() {
        try {
            const { data, error } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('user_id')
                .eq('user_waiting_for_admin', true)
                .eq('is_active', false)

            if (error) {
                console.error('Error getting users waiting for admin', { error: error.message })
                return []
            }

            return data?.map(item => item.user_id) || []
        } catch (error) {
            console.error('Exception getting users waiting for admin', { error })
            return []
        }
    }

    static async getTakeoverStats() {
        try {
            const { count: waitingCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .eq('user_waiting_for_admin', true)
                .eq('is_active', false)

            const { count: activeCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            const today = new Date().toISOString().split('T')[0]
            const { count: todayCount } = await supabaseAdmin
                .from('admin_takeover_states')
                .select('*', { count: 'exact', head: true })
                .gte('takeover_started_at', today)
                .eq('is_active', true)

            return {
                totalWaitingUsers: waitingCount || 0,
                totalActiveTakeovers: activeCount || 0,
                totalTodayTakeovers: todayCount || 0
            }
        } catch (error) {
            console.error('Exception getting takeover stats', { error })
            return {
                totalWaitingUsers: 0,
                totalActiveTakeovers: 0,
                totalTodayTakeovers: 0
            }
        }
    }

    static async releaseAdminTakeover(userId, adminId) {
        try {
            console.log('Releasing admin takeover', { userId, adminId })

            await this.updateTakeoverState(userId, {
                admin_id: adminId,
                is_active: false,
                takeover_ended_at: new Date().toISOString(),
                consecutive_message_count: 0,
                user_waiting_for_admin: false
            })

            await supabaseAdmin
                .from('admin_chat_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_facebook_id', userId)
                .eq('admin_id', adminId)

            console.log('Admin takeover released successfully', { userId, adminId })
        } catch (error) {
            console.error('Error releasing admin takeover', { userId, adminId, error })
        }
    }

    static async resetMessageCounter(userId) {
        try {
            await this.updateTakeoverState(userId, {
                consecutive_message_count: 0,
                last_user_message_at: undefined,
                user_waiting_for_admin: false
            })

            console.log('Message counter reset for user', { userId })
        } catch (error) {
            console.error('Error resetting message counter', { userId, error })
        }
    }
}