import { openaiClient } from './openai'
import { googleAIClient } from './google-ai'
import { AIGenerateRequest, AIGenerateResponse, AIAnalytics } from '@/types'
import { supabase } from '@/lib/supabase'

export class AIUtils {
    /**
     * Generate AI response using available providers
     */
    static async generateResponse(request: AIGenerateRequest): Promise<AIGenerateResponse> {
        const { model } = request

        // Determine which provider to use
        let provider: 'openai' | 'google' = 'openai'

        if (model) {
            provider = model
        } else {
            // Auto-select based on availability
            if (googleAIClient.isEnabled()) {
                provider = 'google'
            } else if (openaiClient.isEnabled()) {
                provider = 'openai'
            } else {
                throw new Error('No AI providers are enabled')
            }
        }

        try {
            let response: AIGenerateResponse

            switch (provider) {
                case 'google':
                    response = await googleAIClient.generateResponse(request)
                    break
                case 'openai':
                default:
                    response = await openaiClient.generateResponse(request)
                    break
            }

            // Log analytics if admin_id is available (for admin dashboard usage)
            // This would be passed in the request context in a real implementation
            await this.logAnalytics({
                admin_id: '', // Would be passed from admin context
                prompt: request.prompt,
                response: response.response,
                tone: request.tone,
                context: request.context,
                model_used: response.model_used,
                tokens_used: response.tokens_used,
                response_time: response.response_time,
                success: true
            })

            return response
        } catch (error) {
            // Log failed request
            await this.logAnalytics({
                admin_id: '', // Would be passed from admin context
                prompt: request.prompt,
                response: '',
                tone: request.tone,
                context: request.context,
                model_used: provider,
                tokens_used: 0,
                response_time: 0,
                success: false,
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })

            throw error
        }
    }

    /**
     * Log AI usage analytics
     */
    private static async logAnalytics(analytics: Omit<AIAnalytics, 'id' | 'created_at'>): Promise<void> {
        try {
            const { error } = await supabase
                .from('ai_analytics')
                .insert([analytics])

            if (error) {
                console.error('Failed to log AI analytics:', error)
            }
        } catch (error) {
            console.error('Error logging AI analytics:', error)
        }
    }

    /**
     * Get AI usage statistics for admin dashboard
     */
    static async getUsageStats(adminId: string, days: number = 30): Promise<any> {
        try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)

            // Get total requests
            const { count: totalRequests } = await supabase
                .from('ai_analytics')
                .select('*', { count: 'exact', head: true })
                .eq('admin_id', adminId)
                .gte('created_at', startDate.toISOString())

            // Get successful requests
            const { count: successfulRequests } = await supabase
                .from('ai_analytics')
                .select('*', { count: 'exact', head: true })
                .eq('admin_id', adminId)
                .eq('success', true)
                .gte('created_at', startDate.toISOString())

            // Get total tokens
            const { data: tokenData } = await supabase
                .from('ai_analytics')
                .select('tokens_used')
                .eq('admin_id', adminId)
                .gte('created_at', startDate.toISOString())

            const totalTokens = tokenData?.reduce((sum, record) => sum + (record.tokens_used || 0), 0) || 0

            // Get average response time
            const { data: timeData } = await supabase
                .from('ai_analytics')
                .select('response_time')
                .eq('admin_id', adminId)
                .eq('success', true)
                .gte('created_at', startDate.toISOString())

            const averageResponseTime = timeData?.length
                ? timeData.reduce((sum, record) => sum + (record.response_time || 0), 0) / timeData.length
                : 0

            // Get popular templates (if template_id exists)
            const { data: templateData } = await supabase
                .from('ai_analytics')
                .select('template_id')
                .eq('admin_id', adminId)
                .not('template_id', 'is', null)
                .gte('created_at', startDate.toISOString())

            const templateUsage = templateData?.reduce((acc: Record<string, number>, record) => {
                if (record.template_id) {
                    acc[record.template_id] = (acc[record.template_id] || 0) + 1
                }
                return acc
            }, {})

            const popularTemplates = templateUsage ? Object.entries(templateUsage)
                .map(([template_id, usage_count]) => ({ template_id, usage_count }))
                .sort((a, b) => b.usage_count - a.usage_count)
                .slice(0, 5) : []

            // Get daily usage for the last 7 days
            const dailyUsage = []
            for (let i = 6; i >= 0; i--) {
                const date = new Date()
                date.setDate(date.getDate() - i)
                const dateStr = date.toISOString().split('T')[0]

                const { count: dayRequests } = await supabase
                    .from('ai_analytics')
                    .select('*', { count: 'exact', head: true })
                    .eq('admin_id', adminId)
                    .gte('created_at', `${dateStr}T00:00:00.000Z`)
                    .lt('created_at', `${dateStr}T23:59:59.999Z`)

                const { data: dayTokenData } = await supabase
                    .from('ai_analytics')
                    .select('tokens_used')
                    .eq('admin_id', adminId)
                    .gte('created_at', `${dateStr}T00:00:00.000Z`)
                    .lt('created_at', `${dateStr}T23:59:59.999Z`)

                const dayTokens = dayTokenData?.reduce((sum, record) => sum + (record.tokens_used || 0), 0) || 0

                dailyUsage.push({
                    date: dateStr,
                    requests: dayRequests || 0,
                    tokens: dayTokens
                })
            }

            return {
                total_requests: totalRequests || 0,
                successful_requests: successfulRequests || 0,
                failed_requests: (totalRequests || 0) - (successfulRequests || 0),
                total_tokens: totalTokens,
                average_response_time: Math.round(averageResponseTime),
                popular_templates: popularTemplates,
                daily_usage: dailyUsage
            }
        } catch (error) {
            console.error('Error getting AI usage stats:', error)
            throw error
        }
    }

    /**
     * Validate AI request
     */
    static validateRequest(request: AIGenerateRequest): { valid: boolean; error?: string } {
        if (!request.prompt || request.prompt.trim().length === 0) {
            return { valid: false, error: 'Prompt không được để trống' }
        }

        if (request.prompt.length > 4000) {
            return { valid: false, error: 'Prompt quá dài (tối đa 4000 ký tự)' }
        }

        if (!['friendly', 'professional', 'casual'].includes(request.tone)) {
            return { valid: false, error: 'Tone không hợp lệ' }
        }

        if (!['user_type', 'situation', 'goal'].includes(request.context)) {
            return { valid: false, error: 'Context không hợp lệ' }
        }

        return { valid: true }
    }

    /**
     * Check if AI features are enabled
     */
    static isAIEnabled(): boolean {
        return openaiClient.isEnabled() || googleAIClient.isEnabled()
    }

    /**
     * Get available AI providers
     */
    static getAvailableProviders(): Array<{ name: string; enabled: boolean }> {
        return [
            { name: 'openai', enabled: openaiClient.isEnabled() },
            { name: 'google', enabled: googleAIClient.isEnabled() }
        ].filter(provider => provider.enabled)
    }
}
