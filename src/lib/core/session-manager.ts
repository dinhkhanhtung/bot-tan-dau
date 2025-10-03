import { updateBotSession, getBotSession } from '../utils'

export interface SessionData {
    current_flow?: string
    step?: string
    data?: any
    started_at?: string
    expires_at?: string
}

export class SessionManager {
    /**
     * Create a new session for a flow
     */
    async createSession(facebookId: string, flow: string, initialData: any = {}): Promise<void> {
        const sessionData: SessionData = {
            current_flow: flow,
            step: 'start',
            data: initialData,
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        }

        await updateBotSession(facebookId, sessionData)
    }

    /**
     * Update session step and data
     */
    async updateSession(facebookId: string, step: string, data: any): Promise<void> {
        const currentSession = await getBotSession(facebookId)
        if (!currentSession) return

        const updatedSession: SessionData = {
            ...currentSession.session_data,
            step,
            data: { ...currentSession.session_data?.data, ...data }
        }

        await updateBotSession(facebookId, updatedSession)
    }

    /**
     * Get current session
     */
    async getSession(facebookId: string): Promise<SessionData | null> {
        const session = await getBotSession(facebookId)
        return session?.session_data || null
    }

    /**
     * Clear session
     */
    async clearSession(facebookId: string): Promise<void> {
        await updateBotSession(facebookId, null)
    }

    /**
     * Check if session is expired
     */
    async isSessionExpired(facebookId: string): Promise<boolean> {
        const session = await getBotSession(facebookId)
        if (!session?.session_data?.expires_at) return true

        return Date.now() > new Date(session.session_data.expires_at).getTime()
    }

    /**
     * Extend session expiry
     */
    async extendSession(facebookId: string, additionalMinutes: number = 30): Promise<void> {
        const session = await getBotSession(facebookId)
        if (!session?.session_data) return

        const updatedSession: SessionData = {
            ...session.session_data,
            expires_at: new Date(Date.now() + additionalMinutes * 60 * 1000).toISOString()
        }

        await updateBotSession(facebookId, updatedSession)
    }

    /**
     * Get session age in minutes
     */
    async getSessionAge(facebookId: string): Promise<number> {
        const session = await getBotSession(facebookId)
        if (!session?.session_data?.started_at) return 0

        return Math.floor((Date.now() - new Date(session.session_data.started_at).getTime()) / (1000 * 60))
    }
}

// Export singleton instance
export const sessionManager = new SessionManager()
