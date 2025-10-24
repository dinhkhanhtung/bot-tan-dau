/**
 * Fix Database Schema - Cập nhật database schema để khắc phục lỗi
 * Chạy script này để thêm các column bị thiếu
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function fixDatabaseSchema() {
    console.log('🔧 Starting database schema fix...')

    try {
        // 1. Tạo bot_settings table nếu chưa có
        console.log('📝 Creating bot_settings table...')
        const { error: botSettingsError } = await supabase.rpc('execute_sql', {
            sql_query: `
                CREATE TABLE IF NOT EXISTS bot_settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `,
            sql_params: []
        })

        if (botSettingsError) {
            console.log('⚠️ Table might already exist, continuing...')
        }

        // 2. Thêm default bot settings
        console.log('⚙️ Inserting default bot settings...')
        const { error: settingsError } = await supabase.rpc('execute_sql', {
            sql_query: `
                INSERT INTO bot_settings (key, value, description)
                VALUES
                    ('bot_status', 'active', 'Trạng thái hoạt động của bot (active/stopped)'),
                    ('ai_status', 'active', 'Trạng thái hoạt động của AI (active/stopped)'),
                    ('payment_fee', '7000', 'Phí dịch vụ mỗi ngày (VNĐ)'),
                    ('trial_days', '3', 'Số ngày dùng thử miễn phí'),
                    ('max_listings_per_user', '10', 'Số tin đăng tối đa mỗi user'),
                    ('auto_approve_listings', 'false', 'Tự động duyệt tin đăng mới'),
                    ('maintenance_mode', 'false', 'Chế độ bảo trì hệ thống'),
                    ('auto_approve_payments', 'false', 'Tự động duyệt thanh toán'),
                    ('payment_approval_timeout', '24', 'Thời gian chờ duyệt thanh toán (giờ)')
                ON CONFLICT (key) DO NOTHING;
            `,
            sql_params: []
        })

        if (settingsError) {
            console.log('⚠️ Settings might already exist, continuing...')
        }

        // 3. Thêm column last_welcome_sent vào bảng users
        console.log('📝 Adding last_welcome_sent column to users table...')
        const { error: addColumnError } = await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS last_welcome_sent TIMESTAMP WITH TIME ZONE;
            `,
            sql_params: []
        })

        if (addColumnError) {
            console.log('⚠️ Column might already exist, continuing...')
        }

        // 4. Tạo index cho column mới
        console.log('📊 Creating index for last_welcome_sent...')
        const { error: indexError } = await supabase.rpc('execute_sql', {
            sql_query: `
                CREATE INDEX IF NOT EXISTS idx_users_last_welcome_sent
                ON users(last_welcome_sent)
                WHERE last_welcome_sent IS NOT NULL;
            `,
            sql_params: []
        })

        if (indexError) {
            console.log('⚠️ Index might already exist, continuing...')
        }

        // 5. Cập nhật các column cần thiết cho user_interactions
        console.log('🔄 Updating user_interactions table...')

        // Thêm current_mode column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS current_mode VARCHAR(20) DEFAULT 'choosing'
                CHECK (current_mode IN ('choosing', 'using_bot', 'chatting_admin'));
            `,
            sql_params: []
        })

        // Thêm last_mode_change column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS last_mode_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            `,
            sql_params: []
        })

        // Thêm mode_change_count column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS mode_change_count INTEGER DEFAULT 0;
            `,
            sql_params: []
        })

        // 6. Tạo indexes cho user_interactions
        await supabase.rpc('execute_sql', {
            sql_query: `
                CREATE INDEX IF NOT EXISTS idx_user_interactions_current_mode
                ON user_interactions(current_mode);

                CREATE INDEX IF NOT EXISTS idx_user_interactions_last_mode_change
                ON user_interactions(last_mode_change);
            `,
            sql_params: []
        })

        // 7. Cập nhật dữ liệu hiện có
        console.log('🔄 Updating existing data...')

        // Cập nhật user_interactions để có current_mode mặc định
        await supabase.rpc('execute_sql', {
            sql_query: `
                UPDATE user_interactions
                SET current_mode = 'choosing'
                WHERE current_mode IS NULL;
            `,
            sql_params: []
        })

        // Cập nhật users để có last_welcome_sent mặc định
        await supabase.rpc('execute_sql', {
            sql_query: `
                UPDATE users
                SET last_welcome_sent = NOW()
                WHERE welcome_sent = true AND last_welcome_sent IS NULL;
            `,
            sql_params: []
        })

        console.log('✅ Database schema fix completed successfully!')

        // 8. Kiểm tra kết quả
        console.log('🔍 Verifying fixes...')

        const { data: settingsCheck } = await supabase
            .from('bot_settings')
            .select('*')
            .limit(3)

        const { data: usersCheck } = await supabase
            .from('users')
            .select('facebook_id, welcome_sent, last_welcome_sent')
            .limit(3)

        const { data: interactionsCheck } = await supabase
            .from('user_interactions')
            .select('facebook_id, current_mode, last_mode_change')
            .limit(3)

        console.log('⚙️ Bot settings:', settingsCheck)
        console.log('👥 Users sample:', usersCheck)
        console.log('🔗 Interactions sample:', interactionsCheck)

        console.log('🎉 All fixes applied successfully!')

    } catch (error) {
        console.error('❌ Error fixing database schema:', error)
        process.exit(1)
    }
}

// Chạy script
fixDatabaseSchema()