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
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
        const decoded = jwt.verify(token, jwtSecret) as any

        // Get comprehensive statistics
        const [usersResult, paymentsResult, listingsResult] = await Promise.all([
            supabaseAdmin.from('users').select('status, created_at, membership_expires_at'),
            supabaseAdmin.from('payments').select('status, amount, created_at, approved_at'),
            supabaseAdmin.from('listings').select('status, created_at, views, category')
        ])

        if (usersResult.error || paymentsResult.error || listingsResult.error) {
            console.error('Error fetching dashboard stats')
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        const users = usersResult.data || []
        const payments = paymentsResult.data || []
        const listings = listingsResult.data || []

        // Calculate statistics
        const today = new Date().toISOString().split('T')[0]

        // User stats
        const totalUsers = users.length
        const activeUsers = users.filter(u => u.status === 'registered').length
        const trialUsers = users.filter(u => u.status === 'trial').length
        const todayUsers = users.filter(u => u.created_at?.startsWith(today)).length

        // Payment stats
        const pendingPayments = payments.filter(p => p.status === 'pending').length
        const approvedPayments = payments.filter(p => p.status === 'approved')
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const todayPayments = payments.filter(p => p.created_at?.startsWith(today))
        const todayRevenue = todayPayments
            .filter(p => p.status === 'approved')
            .reduce((sum, p) => sum + (p.amount || 0), 0)

        // Listing stats
        const totalListings = listings.length
        const activeListings = listings.filter(l => l.status === 'active').length
        const todayListings = listings.filter(l => l.created_at?.startsWith(today)).length

        const stats = {
            totalUsers,
            activeUsers,
            trialUsers,
            totalRevenue,
            pendingPayments,
            totalListings,
            activeListings,
            todayStats: {
                newUsers: todayUsers,
                newListings: todayListings,
                revenue: todayRevenue
            }
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
