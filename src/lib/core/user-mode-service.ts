/**
 * User Mode Service
 * Quản lý các chế độ hoạt động của user (normal, premium, admin)
 * Xử lý logic phân luồng dựa trên mode của user
 */

import { supabaseAdmin } from '../supabase.js'
import { logger } from '../logger.js'

export enum UserMode {
    NORMAL = 'normal',
    PREMIUM = 'premium',
    ADMIN = 'admin'
}

export interface UserState {
    user_id: string
    current_mode: UserMode
    bot_active: boolean
    last_activity: string
    preferences?: Record<string, any>
    created_at?: string
    updated_at?: string
}

export class UserModeService {
    /**
     * Lấy mode hiện tại của user
     */
    static async getUserMode(userId: string): Promise<UserMode> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('current_mode')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user mode', { userId, error: error.message })
                return UserMode.NORMAL // Default fallback
            }

            return (data?.current_mode as UserMode) || UserMode.NORMAL
        } catch (error) {
            logger.error('Exception getting user mode', { userId, error })
            return UserMode.NORMAL
        }
    }

    /**
     * Cập nhật mode của user
     */
    static async setUserMode(userId: string, mode: UserMode): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    user_id: userId,
                    current_mode: mode,
                    last_activity: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (error) {
                logger.error('Error setting user mode', { userId, mode, error: error.message })
            } else {
                logger.info('User mode updated', { userId, mode })
            }
        } catch (error) {
            logger.error('Exception setting user mode', { userId, mode, error })
        }
    }

    /**
     * Kiểm tra user có mode cao hơn không
     */
    static async hasHigherMode(userId: string, requiredMode: UserMode): Promise<boolean> {
        try {
            const currentMode = await this.getUserMode(userId)
            const modeHierarchy = {
                [UserMode.NORMAL]: 0,
                [UserMode.PREMIUM]: 1,
                [UserMode.ADMIN]: 2
            }

            return modeHierarchy[currentMode] >= modeHierarchy[requiredMode]
        } catch (error) {
            logger.error('Exception checking user mode', { userId, requiredMode, error })
            return false
        }
    }

    /**
     * Lấy trạng thái đầy đủ của user
     */
    static async getUserState(userId: string): Promise<UserState | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                logger.error('Error getting user state', { userId, error: error.message })
                return null
            }

            return data
        } catch (error) {
            logger.error('Exception getting user state', { userId, error })
            return null
        }
    }

    /**
     * Cập nhật trạng thái của user
     */
    static async updateUserState(userId: string, updates: Partial<UserState>): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('user_interactions')
                .upsert({
                    user_id: userId,
                    ...updates,
                    updated_at: new Date().toISOString()
                })

            if (error) {
                logger.error('Error updating user state', { userId, updates, error: error.message })
            }
        } catch (error) {
            logger.error('Exception updating user state', { userId, error })
        }
    }

    /**
     * Kiểm tra và nâng cấp mode nếu cần thiết
     */
    static async upgradeUserModeIfEligible(userId: string): Promise<void> {
        try {
            // Logic kiểm tra điều kiện nâng cấp mode
            // Ví dụ: dựa trên điểm tích lũy, thời gian sử dụng, etc.

            const userState = await this.getUserState(userId)
            if (!userState) return

            // Kiểm tra điều kiện để nâng cấp lên PREMIUM
            if (userState.current_mode === UserMode.NORMAL) {
                // Logic kiểm tra điều kiện premium
                const isEligibleForPremium = await this.checkPremiumEligibility(userId)

                if (isEligibleForPremium) {
                    await this.setUserMode(userId, UserMode.PREMIUM)
                    logger.info('User upgraded to premium', { userId })
                }
            }

        } catch (error) {
            logger.error('Exception upgrading user mode', { userId, error })
        }
    }

    /**
     * Kiểm tra điều kiện để được nâng cấp lên premium
     */
    private static async checkPremiumEligibility(userId: string): Promise<boolean> {
        try {
            // Kiểm tra dựa trên các điều kiện:
            // 1. Số điểm tích lũy
            // 2. Thời gian sử dụng
            // 3. Số giao dịch thành công
            // 4. Hoạt động tích cực

            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('created_at, status')
                .eq('facebook_id', userId)
                .single()

            if (!userData) return false

            // Kiểm tra thời gian sử dụng (tối thiểu 30 ngày)
            const accountAge = Date.now() - new Date(userData.created_at).getTime()
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000

            if (accountAge < thirtyDaysInMs) return false

            // Kiểm tra trạng thái active
            if (userData.status !== 'active') return false

            // Kiểm tra số giao dịch thành công (tối thiểu 5)
            const { count: transactionCount } = await supabaseAdmin
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed')

            if (transactionCount && transactionCount >= 5) {
                return true
            }

            return false

        } catch (error) {
            logger.error('Exception checking premium eligibility', { userId, error })
            return false
        }
    }

    /**
     * Reset mode về normal
     */
    static async resetToNormalMode(userId: string): Promise<void> {
        try {
            await this.setUserMode(userId, UserMode.NORMAL)
            logger.info('User mode reset to normal', { userId })
        } catch (error) {
            logger.error('Exception resetting user mode', { userId, error })
        }
    }

    /**
     * Lấy thống kê theo mode
     */
    static async getModeStats(): Promise<Record<UserMode, number>> {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_interactions')
                .select('current_mode')

            if (error) {
                logger.error('Error getting mode stats', { error: error.message })
                return {
                    [UserMode.NORMAL]: 0,
                    [UserMode.PREMIUM]: 0,
                    [UserMode.ADMIN]: 0
                }
            }

            const stats = {
                [UserMode.NORMAL]: 0,
                [UserMode.PREMIUM]: 0,
                [UserMode.ADMIN]: 0
            }

            data?.forEach(user => {
                const mode = user.current_mode as UserMode
                if (mode && stats[mode] !== undefined) {
                    stats[mode]++
                }
            })

            return stats

        } catch (error) {
            logger.error('Exception getting mode stats', { error })
            return {
                [UserMode.NORMAL]: 0,
                [UserMode.PREMIUM]: 0,
                [UserMode.ADMIN]: 0
            }
        }
    }
}