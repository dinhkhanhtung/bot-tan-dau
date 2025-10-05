import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
    try {
        // Verify admin token
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production')

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'

        // Calculate date range
        const now = new Date()
        const daysBack = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

        // Get comprehensive statistics
        const [usersResult, paymentsResult, listingsResult, categoriesResult] = await Promise.all([
            supabaseAdmin.from('users').select('status, created_at, membership_expires_at'),
            supabaseAdmin.from('payments').select('status, amount, created_at, approved_at'),
            supabaseAdmin.from('listings').select('status, created_at, views, category'),
            supabaseAdmin.from('listings').select('category')
        ])

        if (usersResult.error || paymentsResult.error || listingsResult.error || categoriesResult.error) {
            console.error('Error fetching stats data')
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        const users = usersResult.data || []
        const payments = paymentsResult.data || []
        const listings = listingsResult.data || []
        const allListings = categoriesResult.data || []

        // Calculate overview stats
        const totalUsers = users.length
        const activeUsers = users.filter(u => u.status === 'registered').length
        const trialUsers = users.filter(u => u.status === 'trial').length

        const approvedPayments = payments.filter(p => p.status === 'approved')
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const pendingPayments = payments.filter(p => p.status === 'pending').length

        const totalListings = listings.length
        const activeListings = listings.filter(l => l.status === 'active').length

        // Calculate today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayUsers = users.filter(u => u.created_at?.startsWith(today)).length
        const todayListings = listings.filter(l => l.created_at?.startsWith(today)).length
        const todayPayments = payments.filter(p => p.created_at?.startsWith(today)).length
        const todayRevenue = payments
            .filter(p => p.created_at?.startsWith(today) && p.status === 'approved')
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        // Calculate growth (compare with previous period)
        const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))

        const currentPeriodUsers = users.filter(u => new Date(u.created_at) >= startDate).length
        const prevPeriodUsers = users.filter(u => {
            const createdAt = new Date(u.created_at)
            return createdAt >= prevStartDate && createdAt < startDate
        }).length

        const currentPeriodRevenue = payments
            .filter(p => p.status === 'approved' && new Date(p.created_at) >= startDate)
            .reduce((sum, p) => sum + (p.amount || 0), 0)
        const prevPeriodRevenue = payments
            .filter(p => {
                const createdAt = new Date(p.created_at)
                return p.status === 'approved' && createdAt >= prevStartDate && createdAt < startDate
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        const currentPeriodListings = listings.filter(l => new Date(l.created_at) >= startDate).length
        const prevPeriodListings = listings.filter(l => {
            const createdAt = new Date(l.created_at)
            return createdAt >= prevStartDate && createdAt < startDate
        }).length

        const usersGrowth = prevPeriodUsers > 0 ? ((currentPeriodUsers - prevPeriodUsers) / prevPeriodUsers) * 100 : 0
        const revenueGrowth = prevPeriodRevenue > 0 ? ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0
        const listingsGrowth = prevPeriodListings > 0 ? ((currentPeriodListings - prevPeriodListings) / prevPeriodListings) * 100 : 0

        // Calculate top categories
        const categoryStats = allListings.reduce((acc: any, listing: any) => {
            acc[listing.category] = (acc[listing.category] || 0) + 1
            return acc
        }, {})

        const totalCategoryCount = Object.values(categoryStats).reduce((sum: number, count: any) => sum + count, 0)
        const topCategories = Object.entries(categoryStats)
            .map(([category, count]) => ({
                category,
                count: count as number,
                percentage: totalCategoryCount > 0 ? ((count as number) / totalCategoryCount) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // Get real recent activity from database
        const [recentUsers, recentPayments, recentListings] = await Promise.all([
            supabaseAdmin
                .from('users')
                .select('id, name, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('payments')
                .select('id, user_id, status, created_at, users(name)')
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('listings')
                .select('id, user_id, title, created_at, users(name)')
                .order('created_at', { ascending: false })
                .limit(5)
        ])

        // Combine and format recent activity
        const recentActivity = []
        
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
        recentPayments.data?.forEach(payment => {
            recentActivity.push({
                id: payment.id,
                type: 'payment',
                description: `Thanh toán ${payment.status === 'approved' ? 'được duyệt' : payment.status === 'rejected' ? 'bị từ chối' : 'đang chờ duyệt'}`,
                timestamp: payment.created_at,
                user: payment.users?.name || 'Unknown'
            })
        })

        // Add recent listings
        recentListings.data?.forEach(listing => {
            recentActivity.push({
                id: listing.id,
                type: 'listing',
                description: 'Tin đăng mới được tạo',
                timestamp: listing.created_at,
                user: listing.users?.name || 'Unknown'
            })
        })

        // Sort by timestamp and limit to 10
        const sortedActivity = recentActivity
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10)

        const stats = {
            overview: {
                totalUsers,
                activeUsers,
                trialUsers,
                totalRevenue,
                pendingPayments,
                totalListings,
                activeListings
            },
            todayStats: {
                newUsers: todayUsers,
                newListings: todayListings,
                revenue: todayRevenue,
                payments: todayPayments
            },
            growth: {
                usersGrowth,
                revenueGrowth,
                listingsGrowth
            },
            topCategories,
            recentActivity: sortedActivity
        }

        return NextResponse.json({
            success: true,
            stats
        })

    } catch (error) {
        console.error('Admin stats error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
