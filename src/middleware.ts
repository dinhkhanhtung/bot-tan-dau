import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    console.log('🔍 Middleware checking path:', request.nextUrl.pathname)

    // Allow login API and setup API without authentication
    if (request.nextUrl.pathname === '/api/admin/auth/login' ||
        request.nextUrl.pathname === '/api/admin/setup') {
        console.log('✅ Allowing access to login/setup API')
        return NextResponse.next()
    }

    // Check if accessing admin routes (both API and pages)
    if (request.nextUrl.pathname.startsWith('/api/admin') ||
        (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login'))) {

        // For API routes (except login), check for admin token in header
        if (request.nextUrl.pathname.startsWith('/api/admin')) {
            const token = request.headers.get('authorization')?.replace('Bearer ', '')

            console.log('🔑 Token found:', !!token)

            if (!token) {
                console.log('❌ No token found in API request, returning 401')
                return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
            }

            try {
                // Simple token validation - just check if it exists and has basic structure
                if (token && token.length > 10) {
                    console.log('✅ Token validation passed')
                    return NextResponse.next()
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

    // For all other routes, continue normally
    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*']
}
