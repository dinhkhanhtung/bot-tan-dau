import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { StatsService } from '@/lib/stats-service'
import jwt from 'jsonwebtoken'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const statsService = new StatsService()

export async function GET(request: NextRequest) {
    try {
        // Dev bypass: return empty sample stats without calling Supabase
        if (process.env.ADMIN_DEV_BYPASS === 'true') {
            return NextResponse.json({
                success: true,
                stats: {
                    totalUsers: 0,
                    activeUsers: 0,
                    trialUsers: 0,
                    totalRevenue: 0,
                    pendingPayments: 0,
                    totalListings: 0,
                    activeListings: 0,
                    todayStats: { newUsers: 0, newListings: 0, revenue: 0, payments: 0 },
                    growth: { usersGrowth: 0, revenueGrowth: 0, listingsGrowth: 0 },
                    topCategories: [],
                    recentActivity: []
                }
            })
        }
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

        // Get statistics using StatsService
        const { searchParams } = request.nextUrl
        const range = searchParams.get('range') || '7d'

        const statsData = await statsService.getAllStats(range)

        // Map to expected format
        const stats = {
            totalUsers: statsData.overview.totalUsers,
            activeUsers: statsData.overview.activeUsers,
            trialUsers: statsData.overview.trialUsers,
            totalRevenue: statsData.overview.totalRevenue,
            pendingPayments: statsData.overview.pendingPayments,
            totalListings: statsData.overview.totalListings,
            activeListings: statsData.overview.activeListings,
            todayStats: statsData.todayStats,
            growth: statsData.growth,
            topCategories: statsData.topCategories,
            recentActivity: statsData.recentActivity
        }

        return NextResponse.json({
            success: true,
            stats
        })

    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
