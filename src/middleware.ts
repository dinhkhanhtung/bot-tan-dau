import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request: NextRequest) {
    console.log('🔍 Middleware checking path:', request.nextUrl.pathname)

    // Check if accessing admin API routes (not page routes)
    if (request.nextUrl.pathname.startsWith('/api/admin') || (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname.includes('/api/'))) {
        // Allow login API
        if (request.nextUrl.pathname === '/api/admin/auth/login') {
            console.log('✅ Allowing access to login API')
            return NextResponse.next()
        }

        // Check for admin token in header (API requests should send token in Authorization header)
        const token = request.headers.get('authorization')?.replace('Bearer ', '')

        console.log('🔑 Token found:', !!token)

        if (!token) {
            console.log('❌ No token found in API request, returning 401')
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        try {
            // Properly verify JWT token
            const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
            const decoded = jwt.verify(token, jwtSecret) as any

            console.log('✅ Token validation passed for admin:', decoded.username)

            // Add admin info to request headers for API routes
            const response = NextResponse.next()
            response.headers.set('x-admin-id', decoded.adminId)
            response.headers.set('x-admin-username', decoded.username)
            response.headers.set('x-admin-role', decoded.role)

            return response
        } catch (error) {
            console.log('❌ Token verification failed:', error)
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }
    }

    // For page routes, let client-side handle authentication
    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*']
}
