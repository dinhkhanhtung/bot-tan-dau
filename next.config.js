/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@supabase/supabase-js'],
    },
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        JWT_SECRET: process.env.JWT_SECRET,
        FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
        FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
        FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
        FACEBOOK_VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN,
        // AI API Keys - Exposed for client-side usage
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
        // AI Configuration
        OPENAI_ENABLED: process.env.OPENAI_ENABLED,
        GOOGLE_AI_ENABLED: process.env.GOOGLE_AI_ENABLED,
        OPENAI_MODEL: process.env.OPENAI_MODEL,
        GOOGLE_AI_MODEL: process.env.GOOGLE_AI_MODEL,
    },
    // Remove problematic configurations that interfere with Vercel deployment
    // output: 'standalone', // This can cause API route issues
    // generateBuildId: async () => { return 'build-' + Date.now() } // This conflicts with Vercel
}

export default nextConfig
