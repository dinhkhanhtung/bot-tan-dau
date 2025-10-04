import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

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
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bot_tan_dau_jwt_secret_2024_secure_key_xyz789')
            console.log('✅ Token verified for admin:', (decoded as any).username)

            // Add admin info to request headers for API routes
            const response = NextResponse.next()
            response.headers.set('x-admin-id', (decoded as any).adminId)
            response.headers.set('x-admin-role', (decoded as any).role)

            return response
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
