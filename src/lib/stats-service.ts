import { supabaseAdmin } from '@/lib/supabase'

export interface DateRange {
    startDate: Date
    endDate: Date
    prevStartDate: Date
    prevEndDate: Date
}

export interface UserStats {
    totalUsers: number
    activeUsers: number
    trialUsers: number
    newUsers: number
    growth?: number
}

export interface ListingStats {
    totalListings: number
    activeListings: number
    newListings: number
    views: number
    growth?: number
}

export interface RevenueStats {
    totalRevenue: number
    pendingPayments: number
    todayRevenue: number
    todayPayments: number
    growth?: number
}

export interface CategoryStats {
    category: string
    count: number
    percentage: number
}

export interface RecentActivity {
    id: string
    type: string
    description: string
    timestamp: string
    user?: string
}

export interface DatabaseUser {
    id: string
    facebook_id: string
    name: string
    phone: string
    location: string
    birthday: number
    product_service?: string
    status: string
    membership_expires_at?: string
    rating?: number
    total_transactions?: number
    achievements?: string[]
    referral_code: string
    avatar_url?: string
    email?: string
    bio?: string
    website?: string
    social_links?: any
    is_online?: boolean
    last_seen?: string
    welcome_message_sent?: boolean
    welcome_interaction_count?: number
    chat_mode?: string
    created_at: string
    updated_at?: string
}

export interface DatabaseListing {
    id: string
    user_id: string
    type: string
    category: string
    subcategory: string
    title: string
    price: number
    description: string
    images?: string[]
    location: string
    status: string
    is_featured?: boolean
    views?: number
    created_at: string
    updated_at?: string
    users?: {
        name: string
    }
}

export interface DatabasePayment {
    id: string
    user_id: string
    amount: number
    receipt_image?: string
    status: string
    created_at: string
    approved_at?: string
    users?: {
        name: string
    }
}

export interface GrowthStats {
    usersGrowth: number
    revenueGrowth: number
    listingsGrowth: number
}

export interface AllStatsResponse {
    overview: {
        totalUsers: number
        activeUsers: number
        trialUsers: number
        totalRevenue: number
        pendingPayments: number
        totalListings: number
        activeListings: number
    }
    todayStats: {
        newUsers: number
        newListings: number
        revenue: number
        payments: number
    }
    growth: GrowthStats
    topCategories: CategoryStats[]
    recentActivity: RecentActivity[]
}

export class StatsService {
    private getDateRange(range: string): DateRange {
        console.log('🔍 [StatsService] getDateRange called with:', range)
        const now = new Date()
        const daysBack = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

        // Calculate previous period for growth comparison
        const periodLength = now.getTime() - startDate.getTime()
        const prevStartDate = new Date(startDate.getTime() - periodLength)

        const result = {
            startDate,
            endDate: now,
            prevStartDate,
            prevEndDate: startDate
        }
        console.log('📊 [StatsService] DateRange result:', result)
        return result
    }

    async getUserStats(range: string = '7d'): Promise<UserStats> {
        console.log('🔍 [StatsService] getUserStats called with range:', range)
        const { startDate, prevStartDate, prevEndDate } = this.getDateRange(range)

        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('status, created_at, membership_expires_at')

        if (error) {
            console.error('❌ [StatsService] Error fetching users:', error)
            throw new Error(`Failed to fetch users: ${error.message}`)
        }

        const usersList = users || []
        console.log('📊 [StatsService] Users data:', { total: usersList.length, startDate, prevStartDate, prevEndDate })

        // Current period stats
        const totalUsers = usersList.length
        const activeUsers = usersList.filter((u: any) => u.status === 'registered').length
        const trialUsers = usersList.filter((u: any) => u.status === 'trial').length

        // Today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = usersList.filter((u: any) => u.created_at?.startsWith(today)).length

        // Growth calculation
        const currentPeriodUsers = usersList.filter((u: any) => new Date(u.created_at) >= startDate).length
        const prevPeriodUsers = usersList.filter((u: any) => {
            const createdAt = new Date(u.created_at)
            return createdAt >= prevStartDate && createdAt < prevEndDate
        }).length

        const usersGrowth = prevPeriodUsers > 0 ? ((currentPeriodUsers - prevPeriodUsers) / prevPeriodUsers) * 100 : 0

        return {
            totalUsers,
            activeUsers,
            trialUsers,
            newUsers: todayUsers,
            growth: usersGrowth
        }
    }

    async getListingStats(range: string = '7d'): Promise<ListingStats> {
        const { startDate, prevStartDate, prevEndDate } = this.getDateRange(range)

        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('status, created_at, views, category')

        if (error) {
            throw new Error(`Failed to fetch listings: ${error.message}`)
        }

        const listingsList = listings || []

        // Current period stats
        const totalListings = listingsList.length
        const activeListings = listingsList.filter((l: any) => l.status === 'active').length
        const totalViews = listingsList.reduce((sum: number, l: any) => sum + (l.views || 0), 0)

        // Today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayListings = listingsList.filter((l: any) => l.created_at?.startsWith(today)).length

        // Growth calculation
        const currentPeriodListings = listingsList.filter((l: any) => new Date(l.created_at) >= startDate).length
        const prevPeriodListings = listingsList.filter((l: any) => {
            const createdAt = new Date(l.created_at)
            return createdAt >= prevStartDate && createdAt < prevEndDate
        }).length

        const listingsGrowth = prevPeriodListings > 0 ? ((currentPeriodListings - prevPeriodListings) / prevPeriodListings) * 100 : 0

        return {
            totalListings,
            activeListings,
            newListings: todayListings,
            views: totalViews,
            growth: listingsGrowth
        }
    }

    async getRevenueStats(range: string = '7d'): Promise<RevenueStats> {
        const { startDate, prevStartDate, prevEndDate } = this.getDateRange(range)

        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('status, amount, created_at, approved_at')

        if (error) {
            throw new Error(`Failed to fetch payments: ${error.message}`)
        }

        const paymentsList = payments || []

        // Current period stats
        const approvedPayments = paymentsList.filter((p: any) => p.status === 'approved')
        const totalRevenue = approvedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        const pendingPayments = paymentsList.filter((p: any) => p.status === 'pending').length

        // Today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayPayments = paymentsList.filter((p: any) => p.created_at?.startsWith(today)).length
        const todayRevenue = paymentsList
            .filter((p: any) => p.created_at?.startsWith(today) && p.status === 'approved')
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

        // Growth calculation
        const currentPeriodRevenue = paymentsList
            .filter((p: any) => p.status === 'approved' && new Date(p.created_at) >= startDate)
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        const prevPeriodRevenue = paymentsList
            .filter((p: any) => {
                const createdAt = new Date(p.created_at)
                return p.status === 'approved' && createdAt >= prevStartDate && createdAt < prevEndDate
            })
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

        const revenueGrowth = prevPeriodRevenue > 0 ? ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0

        return {
            totalRevenue,
            pendingPayments,
            todayRevenue,
            todayPayments,
            growth: revenueGrowth
        }
    }

    async getTopCategories(limit: number = 10): Promise<CategoryStats[]> {
        const { data: listings, error } = await supabaseAdmin
            .from('listings')
            .select('category')

        if (error) {
            throw new Error(`Failed to fetch categories: ${error.message}`)
        }

        const listingsList = listings || []

        // Calculate category statistics
        const categoryStats = listingsList.reduce((acc: Record<string, number>, listing: any) => {
            const category = listing.category || 'Uncategorized'
            acc[category] = (acc[category] || 0) + 1
            return acc
        }, {})

        const totalCategoryCount = Object.values(categoryStats).reduce((sum: number, count: number) => sum + count, 0)

        return Object.entries(categoryStats)
            .map(([category, count]) => ({
                category,
                count: count as number,
                percentage: totalCategoryCount > 0 ? ((count as number) / totalCategoryCount) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
    }

    async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
        // Get recent activity from database
        const [recentUsers, recentPayments, recentListings] = await Promise.all([
            supabaseAdmin
                .from('users')
                .select('id, name, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('payments')
                .select('id, user_id, status, created_at, users!inner(name)')
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('listings')
                .select('id, user_id, title, created_at, users!inner(name)')
                .order('created_at', { ascending: false })
                .limit(5)
        ])

        // Combine and format recent activity
        const recentActivity: RecentActivity[] = []

        // Add recent users
        recentUsers.data?.forEach(user => {
            recentActivity.push({
                id: user.id,
                type: 'user',
                description: 'Người dùng mới đăng ký',
                timestamp: user.created_at,
                user: user.name
            })
        })

        // Add recent payments
        recentPayments.data?.forEach((payment: any) => {
            recentActivity.push({
                id: payment.id,
                type: 'payment',
                description: `Thanh toán ${payment.status === 'approved' ? 'được duyệt' : payment.status === 'rejected' ? 'bị từ chối' : 'đang chờ duyệt'}`,
                timestamp: payment.created_at,
                user: payment.users?.name || 'Unknown'
            })
        })

        // Add recent listings
        recentListings.data?.forEach((listing: any) => {
            recentActivity.push({
                id: listing.id,
                type: 'listing',
                description: 'Tin đăng mới được tạo',
                timestamp: listing.created_at,
                user: listing.users?.name || 'Unknown'
            })
        })

        // Sort by timestamp and limit
        return recentActivity
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit)
    }

    async getGrowthStats(range: string = '7d'): Promise<GrowthStats> {
        const { startDate, prevStartDate, prevEndDate } = this.getDateRange(range)

        // Get data for growth calculations
        const [usersResult, paymentsResult, listingsResult] = await Promise.all([
            supabaseAdmin.from('users').select('created_at'),
            supabaseAdmin.from('payments').select('status, amount, created_at'),
            supabaseAdmin.from('listings').select('created_at')
        ])

        if (usersResult.error || paymentsResult.error || listingsResult.error) {
            throw new Error('Failed to fetch growth data')
        }

        const users = usersResult.data || []
        const payments = paymentsResult.data || []
        const listings = listingsResult.data || []

        // Calculate current and previous period stats
        const currentPeriodUsers = users.filter((u: any) => new Date(u.created_at) >= startDate).length
        const prevPeriodUsers = users.filter((u: any) => {
            const createdAt = new Date(u.created_at)
            return createdAt >= prevStartDate && createdAt < prevEndDate
        }).length

        const currentPeriodRevenue = payments
            .filter((p: any) => p.status === 'approved' && new Date(p.created_at) >= startDate)
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        const prevPeriodRevenue = payments
            .filter((p: any) => {
                const createdAt = new Date(p.created_at)
                return p.status === 'approved' && createdAt >= prevStartDate && createdAt < prevEndDate
            })
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

        const currentPeriodListings = listings.filter((l: any) => new Date(l.created_at) >= startDate).length
        const prevPeriodListings = listings.filter((l: any) => {
            const createdAt = new Date(l.created_at)
            return createdAt >= prevStartDate && createdAt < prevEndDate
        }).length

        // Calculate growth percentages
        const usersGrowth = prevPeriodUsers > 0 ? ((currentPeriodUsers - prevPeriodUsers) / prevPeriodUsers) * 100 : 0
        const revenueGrowth = prevPeriodRevenue > 0 ? ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0
        const listingsGrowth = prevPeriodListings > 0 ? ((currentPeriodListings - prevPeriodListings) / prevPeriodListings) * 100 : 0

        return {
            usersGrowth,
            revenueGrowth,
            listingsGrowth
        }
    }

    async getAllStats(range: string = '7d'): Promise<AllStatsResponse> {
        console.log('🔍 [StatsService] getAllStats called with range:', range)
        const [userStats, listingStats, revenueStats, growthStats, topCategories, recentActivity] = await Promise.all([
            this.getUserStats(range),
            this.getListingStats(range),
            this.getRevenueStats(range),
            this.getGrowthStats(range),
            this.getTopCategories(),
            this.getRecentActivity()
        ])

        const result = {
            overview: {
                totalUsers: userStats.totalUsers,
                activeUsers: userStats.activeUsers,
                trialUsers: userStats.trialUsers,
                totalRevenue: revenueStats.totalRevenue,
                pendingPayments: revenueStats.pendingPayments,
                totalListings: listingStats.totalListings,
                activeListings: listingStats.activeListings
            },
            todayStats: {
                newUsers: userStats.newUsers,
                newListings: listingStats.newListings,
                revenue: revenueStats.todayRevenue,
                payments: revenueStats.todayPayments
            },
            growth: growthStats,
            topCategories,
            recentActivity
        }
        console.log('✅ [StatsService] getAllStats completed:', {
            overview: result.overview,
            todayStats: result.todayStats,
            growth: result.growth
        })
        return result
    }
}