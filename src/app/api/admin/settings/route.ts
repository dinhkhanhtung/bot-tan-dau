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

        // Get current settings from database
        const { data: settings, error } = await supabaseAdmin
            .from('bot_settings')
            .select('*')

        if (error) {
            console.error('Error fetching settings:', error)
            return NextResponse.json(
                { success: false, message: 'Database error' },
                { status: 500 }
            )
        }

        // Convert settings array to object
        const settingsObj = settings?.reduce((acc: any, setting: any) => {
            acc[setting.key] = setting.value
            return acc
        }, {}) || {}

        // Default settings
        const defaultSettings = {
            botStatus: 'active',
            paymentFee: 7000,
            trialDays: 3,
            maxListingsPerUser: 10,
            autoApproveListings: false,
            maintenanceMode: false,
            ...settingsObj
        }

        return NextResponse.json({
            success: true,
            settings: defaultSettings
        })

    } catch (error) {
        console.error('Admin settings error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
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

        const updates = await request.json()

        // Update settings in database
        const settingsToUpdate = Object.entries(updates).map(([key, value]) => ({
            key,
            value: String(value),
            updated_at: new Date().toISOString()
        }))

        // Use upsert to insert or update settings
        for (const setting of settingsToUpdate) {
            const { error } = await supabaseAdmin
                .from('bot_settings')
                .upsert(setting, { onConflict: 'key' })

            if (error) {
                console.error('Error updating setting:', setting.key, error)
                return NextResponse.json(
                    { success: false, message: 'Database error' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully'
        })

    } catch (error) {
        console.error('Admin settings POST error:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
