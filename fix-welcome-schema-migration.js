/**
 * Fix Welcome Schema Migration
 * Script để thêm cột last_welcome_sent vào bảng users hiện tại
 * Chạy script này để khắc phục lỗi "Could not find the 'last_welcome_sent' column"
 */

import { supabaseAdmin } from './src/lib/supabase';

async function fixWelcomeSchema() {
    console.log('🔧 Starting welcome schema migration...');

    try {
        // 1. Thêm cột last_welcome_sent vào bảng users
        console.log('📝 Adding last_welcome_sent column to users table...');

        const { error: addColumnError } = await supabaseAdmin.rpc('execute_sql', {
            sql_query: `
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS last_welcome_sent TIMESTAMP WITH TIME ZONE;

                -- Tạo index cho cột mới
                CREATE INDEX IF NOT EXISTS idx_users_last_welcome_sent
                ON users(last_welcome_sent)
                WHERE last_welcome_sent IS NOT NULL;

                -- Thêm comment cho cột
                COMMENT ON COLUMN users.last_welcome_sent IS 'Thời gian gửi welcome message cuối cùng (để tính 24h cooldown)';
            `
        });

        if (addColumnError) {
            console.error('❌ Failed to add last_welcome_sent column:', addColumnError);
            return;
        }

        console.log('✅ Successfully added last_welcome_sent column to users table');

        // 2. Cập nhật dữ liệu hiện có - đồng bộ với user_interactions
        console.log('🔄 Syncing existing data with user_interactions table...');

        const { error: syncError } = await supabaseAdmin.rpc('execute_sql', {
            sql_query: `
                -- Cập nhật last_welcome_sent từ user_interactions nếu có
                UPDATE users
                SET last_welcome_sent = ui.last_welcome_sent
                FROM user_interactions ui
                WHERE users.facebook_id = ui.facebook_id
                AND ui.last_welcome_sent IS NOT NULL
                AND users.last_welcome_sent IS NULL;

                -- Nếu user đã có welcome_sent = true nhưng không có last_welcome_sent
                -- thì đặt last_welcome_sent = NOW() - 24h (để tránh spam)
                UPDATE users
                SET last_welcome_sent = NOW() - INTERVAL '24 hours'
                WHERE welcome_sent = true
                AND last_welcome_sent IS NULL;
            `
        });

        if (syncError) {
            console.error('❌ Failed to sync existing data:', syncError);
            return;
        }

        console.log('✅ Successfully synced existing data');

        // 3. Kiểm tra kết quả
        console.log('🔍 Verifying migration results...');

        const { data: verificationData, error: verificationError } = await supabaseAdmin
            .from('users')
            .select('facebook_id, welcome_sent, last_welcome_sent')
            .not('last_welcome_sent', 'is', null)
            .limit(5);

        if (verificationError) {
            console.error('❌ Failed to verify migration:', verificationError);
            return;
        }

        console.log('✅ Migration verification successful');
        console.log('Sample users with last_welcome_sent:');
        console.table(verificationData);

        // 4. Kiểm tra schema
        console.log('📋 Checking final schema...');

        const { data: schemaData, error: schemaError } = await supabaseAdmin.rpc('execute_sql', {
            sql_query: `
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'last_welcome_sent';
            `
        });

        if (schemaError) {
            console.error('❌ Failed to check schema:', schemaError);
            return;
        }

        console.log('✅ Schema verification successful');
        console.log('last_welcome_sent column details:');
        console.table(schemaData);

        console.log('🎉 Welcome schema migration completed successfully!');
        console.log('🚀 The bot should now work without the "last_welcome_sent column" error');

    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Chạy migration nếu file được gọi trực tiếp
fixWelcomeSchema()
    .then(() => {
        console.log('✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    });

export { fixWelcomeSchema };
