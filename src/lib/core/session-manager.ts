import { supabaseAdmin } from '../supabase'

/**
 * Unified session management service
 * Replaces all direct database calls for session handling
 */
export class SessionManager {
    /**
     * Create a new session
     */
    static async createSession(facebookId: string, flowName: string, step: number = 0, data: any = {}): Promise<any> {
        try {
            // Delete any existing session first
            await this.deleteSession(facebookId)

            // Create new session
            const { data: session, error } = await supabaseAdmin
                .from('bot_sessions')
                .insert({
                    facebook_id: facebookId,
                    current_flow: flowName,
                    step: step,
                    current_step: step,
                    data: data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('❌ Session creation error:', error)
                throw error
            }

            console.log(`✅ Session created for ${facebookId} in flow ${flowName}`)
            return session
        } catch (error) {
            console.error('❌ SessionManager.createSession error:', error)
            throw error
        }
    }

    /**
     * Update existing session
     */
    static async updateSession(facebookId: string, updates: {
        step?: number
        data?: any
        current_flow?: string
    }): Promise<any> {
        try {
            const updateData: any = {
                updated_at: new Date().toISOString()
            }

            if (updates.step !== undefined) {
                updateData.step = updates.step
                updateData.current_step = updates.step
            }

            if (updates.data !== undefined) {
                updateData.data = updates.data
            }

            if (updates.current_flow !== undefined) {
                updateData.current_flow = updates.current_flow
            }

            const { data: session, error } = await supabaseAdmin
                .from('bot_sessions')
                .update(updateData)
                .eq('facebook_id', facebookId)
                .select()
                .single()

            if (error) {
                console.error('❌ Session update error:', error)
                throw error
            }

            console.log(`✅ Session updated for ${facebookId}`)
            return session
        } catch (error) {
            console.error('❌ SessionManager.updateSession error:', error)
            throw error
        }
    }

    /**
     * Get session data
     */
    static async getSession(facebookId: string): Promise<any> {
        try {
            const { data: session, error } = await supabaseAdmin
                .from('bot_sessions')
                .select('*')
                .eq('facebook_id', facebookId)
                .single()

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('❌ Session get error:', error)
                throw error
            }

            return session || null
        } catch (error) {
            console.error('❌ SessionManager.getSession error:', error)
            return null
        }
    }

    /**
     * Delete session
     */
    static async deleteSession(facebookId: string): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('bot_sessions')
                .delete()
                .eq('facebook_id', facebookId)

            if (error) {
                console.error('❌ Session delete error:', error)
                throw error
            }

            console.log(`✅ Session deleted for ${facebookId}`)
        } catch (error) {
            console.error('❌ SessionManager.deleteSession error:', error)
            throw error
        }
    }

    /**
     * Check if user has active session
     */
    static async hasActiveSession(facebookId: string): Promise<boolean> {
        const session = await this.getSession(facebookId)
        return session !== null
    }

    /**
     * Get current step from session
     */
    static async getCurrentStep(facebookId: string): Promise<number> {
        const session = await this.getSession(facebookId)
        return session?.step || 0
    }

    /**
     * Get session data
     */
    static async getSessionData(facebookId: string): Promise<any> {
        const session = await this.getSession(facebookId)
        return session?.data || {}
    }
}
