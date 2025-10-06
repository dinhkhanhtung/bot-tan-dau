import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
            // Simple token validation - just check if it exists and has basic structure
            // In production, you might want to implement proper JWT verification
            if (token && token.length > 10) {
                console.log('✅ Token validation passed')

                // Add admin info to request headers for API routes
                const response = NextResponse.next()
                response.headers.set('x-admin-id', '1')
                response.headers.set('x-admin-role', 'super_admin')

                return response
            } else {
                throw new Error('Invalid token format')
            }
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
