import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Get user statistics
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const user_id = searchParams.get('user_id')
        const type = searchParams.get('type') || 'user'

        if (type === 'user' && !user_id) {
            return NextResponse.json(
                { error: 'User ID is required for user stats' },
                { status: 400 }
            )
        }

        if (type === 'user') {
            return await getUserStats(user_id!)
        } else if (type === 'admin') {
            return await getAdminStats()
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
async function getAdminStats() {
    try {
        // Get user counts
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })

        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        const { count: trialUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'trial')

        const { count: paidUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        // Get listing counts
        const { count: totalListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })

        const { count: activeListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        const { count: featuredListings } = await supabaseAdmin
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('is_featured', true)

        // Get connection counts
        const { count: totalConnections } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true })

        // Get daily connections
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: dailyConnections } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        // Get weekly connections
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const { count: weeklyConnections } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneWeekAgo.toISOString())

        // Get monthly connections
        const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        const { count: monthlyConnections } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneMonthAgo.toISOString())

        // Get revenue
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount, created_at')
            .eq('status', 'approved')

        const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

        const dailyRevenue = payments?.filter(p => new Date(p.created_at) >= today)
            .reduce((sum, p) => sum + p.amount, 0) || 0

        const weeklyRevenue = payments?.filter(p => new Date(p.created_at) >= oneWeekAgo)
            .reduce((sum, p) => sum + p.amount, 0) || 0

        const monthlyRevenue = payments?.filter(p => new Date(p.created_at) >= oneMonthAgo)
            .reduce((sum, p) => sum + p.amount, 0) || 0

        return NextResponse.json({
            total_users: totalUsers || 0,
            active_users: activeUsers || 0,
            trial_users: trialUsers || 0,
            paid_users: paidUsers || 0,
            total_listings: totalListings || 0,
            active_listings: activeListings || 0,
            featured_listings: featuredListings || 0,
            total_connections: totalConnections || 0,
            daily_connections: dailyConnections || 0,
            weekly_connections: weeklyConnections || 0,
            monthly_connections: monthlyConnections || 0,
            total_revenue: totalRevenue,
            daily_revenue: dailyRevenue,
            weekly_revenue: weeklyRevenue,
            monthly_revenue: monthlyRevenue
        })
    } catch (error) {
        console.error('Error getting admin stats:', error)
        throw error
    }
}
