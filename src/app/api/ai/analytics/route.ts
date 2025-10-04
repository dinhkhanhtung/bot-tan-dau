import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIUtils } from '@/lib/ai/ai-utils'

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify admin token (simplified - in production, use proper JWT verification)
        const adminInfo = JSON.parse(request.headers.get('x-admin-info') || '{}')
        if (!adminInfo || !adminInfo.id) {
            return NextResponse.json(
                { error: 'Invalid admin session' },
                { status: 401 }
            )
        }

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const includeDetails = searchParams.get('details') === 'true'

        // Get usage statistics
        const usageStats = await AIUtils.getUsageStats(adminInfo.id, days)

        // Get additional analytics if details are requested
        let detailedAnalytics = null
        if (includeDetails) {
            // Get recent AI requests
            const { data: recentRequests } = await supabase
                .from('ai_analytics')
                .select(`
                    *,
                    ai_templates(name, category)
                `)
                .eq('admin_id', adminInfo.id)
                .order('created_at', { ascending: false })
                .limit(50)

            // Get template statistics
            const { data: templateStats } = await supabase
                .from('ai_templates')
                .select('id, name, category, usage_count, created_at')
                .eq('admin_id', adminInfo.id)
                .eq('is_active', true)
                .order('usage_count', { ascending: false })

            // Get model usage breakdown
            const { data: modelUsage } = await supabase
                .from('ai_analytics')
                .select('model_used, tokens_used, response_time, success')
                .eq('admin_id', adminInfo.id)
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

            const modelBreakdown = modelUsage?.reduce((acc: Record<string, any>, record) => {
                if (!acc[record.model_used]) {
                    acc[record.model_used] = {
                        requests: 0,
                        total_tokens: 0,
                        total_time: 0,
                        successful_requests: 0
                    }
                }
                acc[record.model_used].requests++
                acc[record.model_used].total_tokens += record.tokens_used || 0
                acc[record.model_used].total_time += record.response_time || 0
                if (record.success) {
                    acc[record.model_used].successful_requests++
                }
                return acc
            }, {})

            detailedAnalytics = {
                recent_requests: recentRequests || [],
                template_stats: templateStats || [],
                model_breakdown: modelBreakdown || {}
            }
        }

        // Get AI dashboard stats
        const { data: templateCount } = await supabase
            .from('ai_templates')
            .select('*', { count: 'exact', head: true })
            .eq('admin_id', adminInfo.id)
            .eq('is_active', true)

        const { data: activeTemplateCount } = await supabase
            .from('ai_templates')
            .select('*', { count: 'exact', head: true })
            .eq('admin_id', adminInfo.id)
            .eq('is_active', true)
            .gt('usage_count', 0)

        const dashboardStats = {
            today_requests: usageStats.daily_usage[usageStats.daily_usage.length - 1]?.requests || 0,
            weekly_requests: usageStats.daily_usage.slice(-7).reduce((sum: number, day: any) => sum + day.requests, 0),
            monthly_requests: usageStats.total_requests,
            total_templates: templateCount || 0,
            active_templates: activeTemplateCount || 0,
            average_response_time: usageStats.average_response_time,
            success_rate: usageStats.total_requests > 0
                ? Math.round((usageStats.successful_requests / usageStats.total_requests) * 100)
                : 0
        }

        return NextResponse.json({
            success: true,
            data: {
                dashboard_stats: dashboardStats,
                usage_stats: usageStats,
                detailed_analytics: detailedAnalytics
            }
        })

    } catch (error) {
        console.error('AI Analytics API Error:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
