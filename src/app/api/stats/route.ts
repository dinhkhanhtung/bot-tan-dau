import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { StatsService } from '@/lib/stats-service'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const statsService = new StatsService()

// Get user statistics
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const user_id = searchParams.get('user_id')
        const type = searchParams.get('type') || 'user'
        const range = searchParams.get('range') || '7d'

        if (type === 'user' && !user_id) {
            return NextResponse.json(
                { error: 'User ID is required for user stats' },
                { status: 400 }
            )
        }

        if (type === 'user') {
            return await getUserStats(user_id!)
        } else if (type === 'admin') {
            return await getAdminStats(range)
        } else {
            return NextResponse.json(
                { error: 'Invalid stats type' },
                { status: 400 }
            )
        }
    } catch (error) {
        console.error('Error in GET /api/stats:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Get user statistics
async function getUserStats(userId: string) {
    try {
        // Get user listings
        const { data: listings } = await supabaseAdmin
            .from('listings')
            .select('id, status, views, created_at')
            .eq('user_id', userId)

        const totalListings = listings?.length || 0
        const activeListings = listings?.filter(l => l.status === 'active').length || 0
        const soldListings = listings?.filter(l => l.status === 'sold').length || 0
        const totalViews = listings?.reduce((sum, l) => sum + l.views, 0) || 0

        // Get user connections
        const { data: conversations } = await supabaseAdmin
            .from('conversations')
            .select('id, created_at')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

        const totalConnections = conversations?.length || 0

        // Get user ratings
        const { data: ratings } = await supabaseAdmin
            .from('ratings')
            .select('rating')
            .eq('reviewee_id', userId)

        const averageRating = ratings && ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0

        // Get user revenue (from successful connections)
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount, created_at')
            .eq('user_id', userId)
            .eq('status', 'approved')

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

        // Calculate monthly and weekly revenue
        const now = new Date()
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const monthlyRevenue = payments?.filter(p => new Date(p.created_at) >= oneMonthAgo)
            .reduce((sum, p) => sum + p.amount, 0) || 0

        const weeklyRevenue = payments?.filter(p => new Date(p.created_at) >= oneWeekAgo)
            .reduce((sum, p) => sum + p.amount, 0) || 0

        return NextResponse.json({
            total_listings: totalListings,
            active_listings: activeListings,
            sold_listings: soldListings,
            total_views: totalViews,
            total_connections: totalConnections,
            average_rating: Math.round(averageRating * 10) / 10,
            total_ratings: ratings?.length || 0,
            total_revenue: totalRevenue,
            monthly_revenue: monthlyRevenue,
            weekly_revenue: weeklyRevenue
        })
    } catch (error) {
        console.error('Error getting user stats:', error)
        throw error
    }
}

// Get admin statistics
async function getAdminStats(range: string = '7d') {
    try {
        const stats = await statsService.getAllStats(range)

        // Add additional fields not covered by StatsService if needed
        // For now, using StatsService data and mapping to expected format

        return NextResponse.json({
            total_users: stats.overview.totalUsers,
            active_users: stats.overview.activeUsers,
            trial_users: stats.overview.trialUsers,
            paid_users: stats.overview.activeUsers, // Assuming paid users are active
            total_listings: stats.overview.totalListings,
            active_listings: stats.overview.activeListings,
            featured_listings: 0, // Not available in StatsService, set to 0 or fetch separately if needed
            total_connections: 0, // Not available in StatsService, set to 0 or fetch separately if needed
            daily_connections: 0,
            weekly_connections: 0,
            monthly_connections: 0,
            total_revenue: stats.overview.totalRevenue,
            daily_revenue: stats.todayStats.revenue,
            weekly_revenue: 0, // Would need additional calculation or separate fetch
            monthly_revenue: 0, // Would need additional calculation or separate fetch
            todayStats: stats.todayStats,
            growth: stats.growth,
            topCategories: stats.topCategories,
            recentActivity: stats.recentActivity
        })
    } catch (error) {
        console.error('Error getting admin stats:', error)
        throw error
    }
}
