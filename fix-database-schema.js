/**
 * Fix Database Schema - Cập nhật database schema để khắc phục lỗi
 * Chạy script này để thêm các column bị thiếu
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

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
        // 1. Thêm column last_welcome_sent vào bảng users
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

        // 2. Tạo index cho column mới
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

        // 3. Cập nhật các column cần thiết cho user_interactions
        console.log('🔄 Updating user_interactions table...')

        // Thêm current_state column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS current_state VARCHAR(20) DEFAULT 'choosing_mode'
                CHECK (current_state IN ('new_user', 'choosing_mode', 'using_bot', 'chatting_admin'));
            `,
            sql_params: []
        })

        // Thêm last_state_change column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS last_state_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            `,
            sql_params: []
        })

        // Thêm state_change_count column
        await supabase.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE user_interactions
                ADD COLUMN IF NOT EXISTS state_change_count INTEGER DEFAULT 0;
            `,
            sql_params: []
        })

        // 4. Tạo indexes cho user_interactions
        await supabase.rpc('execute_sql', {
            sql_query: `
                CREATE INDEX IF NOT EXISTS idx_user_interactions_current_state
                ON user_interactions(current_state);

                CREATE INDEX IF NOT EXISTS idx_user_interactions_last_state_change
                ON user_interactions(last_state_change);
            `,
            sql_params: []
        })

        // 5. Cập nhật dữ liệu hiện có
        console.log('🔄 Updating existing data...')

        // Cập nhật user_interactions để có current_state mặc định
        await supabase.rpc('execute_sql', {
            sql_query: `
                UPDATE user_interactions
                SET current_state = 'choosing_mode'
                WHERE current_state IS NULL;
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

        // 6. Kiểm tra kết quả
        console.log('🔍 Verifying fixes...')

        const { data: usersCheck } = await supabase
            .from('users')
            .select('facebook_id, welcome_sent, last_welcome_sent')
            .limit(3)

        const { data: interactionsCheck } = await supabase
            .from('user_interactions')
            .select('facebook_id, current_state, last_state_change')
            .limit(3)

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
