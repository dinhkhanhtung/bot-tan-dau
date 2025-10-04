import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    console.log('🔍 Middleware checking path:', request.nextUrl.pathname)

    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Allow login page
        if (request.nextUrl.pathname === '/admin/login') {
            console.log('✅ Allowing access to login page')
            return NextResponse.next()
        }

        // Check for admin token
        const token = request.cookies.get('admin_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '')

        console.log('🔑 Token found:', !!token)

        if (!token) {
            console.log('❌ No token found, redirecting to login')
            return NextResponse.redirect(new URL('/admin/login', request.url))
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
            // Invalid token, redirect to login
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
