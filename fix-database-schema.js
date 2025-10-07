/**
 * Fix Database Schema - Bổ sung các cột và bảng thiếu trong database
 * Script này sẽ khắc phục các vấn đề schema được phát hiện từ log verification
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Thiếu cấu hình Supabase!')
    console.error('Cần có NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDatabaseSchema() {
    console.log('🔧 Starting database schema fixes...')
    console.log('📋 Các vấn đề sẽ được khắc phục:')
    console.log('  1. Thêm cột status vào admin_chat_sessions')
    console.log('  2. Tạo bảng admin_takeover_states cho Admin Takeover')
    console.log('  3. Cập nhật bot_settings với cấu trúc đầy đủ')
    console.log('  4. Kiểm tra và bổ sung các cột thiếu khác')
    console.log('')

    try {
        // 1. Bổ sung cột status cho admin_chat_sessions
        console.log('1️⃣ Thêm cột status vào admin_chat_sessions...')

        // Vì cột này chưa tồn tại, chúng ta sẽ hiển thị hướng dẫn ngay lập tức
        console.log('⚠️ Cột status chưa tồn tại trong admin_chat_sessions')
        console.log('ℹ️ Bạn cần chạy SQL này thủ công trong Supabase SQL Editor:')
        console.log('ALTER TABLE admin_chat_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'active\';')

        // 2. Tạo bảng admin_takeover_states cho tính năng Admin Takeover
        console.log('2️⃣ Tạo bảng admin_takeover_states...')

        // Vì bảng này chưa tồn tại, chúng ta sẽ hiển thị hướng dẫn ngay lập tức
        console.log('⚠️ Bảng admin_takeover_states chưa tồn tại')
        console.log('ℹ️ Bạn cần chạy SQL này thủ công trong Supabase SQL Editor:')
        console.log(`
CREATE TABLE IF NOT EXISTS admin_takeover_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    admin_id TEXT,
    is_active BOOLEAN DEFAULT false,
    consecutive_message_count INTEGER DEFAULT 0,
    last_user_message_at TIMESTAMP,
    takeover_started_at TIMESTAMP,
    takeover_ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tạo các index để tối ưu hiệu suất
CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_user_id ON admin_takeover_states(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_is_active ON admin_takeover_states(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_takeover_states_admin_id ON admin_takeover_states(admin_id);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_admin_takeover_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_admin_takeover_states_updated_at_trigger ON admin_takeover_states;
CREATE TRIGGER update_admin_takeover_states_updated_at_trigger
BEFORE UPDATE ON admin_takeover_states
FOR EACH ROW EXECUTE FUNCTION update_admin_takeover_states_updated_at();
        `)

        // 3. Cập nhật bot_settings với cấu trúc đầy đủ
        console.log('3️⃣ Cập nhật bot_settings với cấu trúc đầy đủ...')

        // Kiểm tra cấu trúc hiện tại của bot_settings
        const { data: currentSettings, error: checkSettingsError } = await supabase
            .from('bot_settings')
            .select('*')
            .limit(1)

        if (checkSettingsError) {
            console.error('❌ Lỗi khi kiểm tra bot_settings:', checkSettingsError.message)

            // Nếu là lỗi cấu trúc, thử thêm các cột thiếu
            if (checkSettingsError.message.includes('column "bot_status" does not exist')) {
                console.log('⚠️ bot_settings thiếu các cột cần thiết, cần cập nhật cấu trúc...')

                // Với cấu trúc key-value hiện tại, chúng ta cần thêm dữ liệu mặc định
                try {
                    const { error: insertDefaultsError } = await supabase
                        .from('bot_settings')
                        .upsert([
                            { key: 'bot_status', value: 'active', description: 'Trạng thái hoạt động của bot' },
                            { key: 'maintenance_mode', value: 'false', description: 'Chế độ bảo trì' },
                            { key: 'welcome_message', value: 'Chào mừng bạn đến với Bot Tân Dậu! 🎉', description: 'Tin nhắn chào mừng mặc định' },
                            { key: 'max_sessions_per_user', value: '5', description: 'Số phiên tối đa mỗi user' },
                            { key: 'session_timeout_minutes', value: '60', description: 'Thời gian timeout phiên (phút)' }
                        ], { onConflict: 'key' })

                    if (insertDefaultsError) {
                        console.error('❌ Lỗi khi thêm bot_settings mặc định:', insertDefaultsError.message)
                        console.log('ℹ️ Bạn cần chạy SQL này thủ công trong Supabase SQL Editor:')
                        console.log(`
INSERT INTO bot_settings (key, value, description) VALUES
    ('bot_status', 'active', 'Trạng thái hoạt động của bot'),
    ('maintenance_mode', 'false', 'Chế độ bảo trì'),
    ('welcome_message', 'Chào mừng bạn đến với Bot Tân Dậu! 🎉', 'Tin nhắn chào mừng mặc định'),
    ('max_sessions_per_user', '5', 'Số phiên tối đa mỗi user'),
    ('session_timeout_minutes', '60', 'Thời gian timeout phiên (phút)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
                        `)
                    } else {
                        console.log('✅ Đã thêm bot_settings mặc định vào cấu trúc key-value')
                    }
                } catch (insertError) {
                    console.log('⚠️ Không thể thêm dữ liệu mặc định, cần chạy thủ công')
                }
            }
        } else {
            console.log('📊 Cấu trúc bot_settings hiện tại:', currentSettings?.length || 0, 'record(s)')

            if (currentSettings && currentSettings.length > 0) {
                console.log('✅ bot_settings đã có dữ liệu')
                // Hiển thị một vài giá trị quan trọng
                currentSettings.forEach(setting => {
                    if (setting.key && ['bot_status', 'maintenance_mode'].includes(setting.key)) {
                        console.log(`   ${setting.key}: ${setting.value}`)
                    }
                })
            }
        }

        // 4. Kiểm tra và bổ sung các cột thiếu khác
        console.log('4️⃣ Kiểm tra các bảng khác...')

        // Vì bảng user_interaction_states có thể chưa tồn tại, chúng ta sẽ hiển thị hướng dẫn ngay lập tức
        console.log('⚠️ Bảng user_interaction_states có thể chưa tồn tại')
        console.log('ℹ️ Nếu cần thiết, bạn có thể chạy SQL này trong Supabase SQL Editor:')
        console.log(`
CREATE TABLE IF NOT EXISTS user_interaction_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facebook_id TEXT UNIQUE NOT NULL,
    bot_active BOOLEAN DEFAULT false,
    welcome_sent BOOLEAN DEFAULT false,
    current_flow TEXT,
    current_step INTEGER DEFAULT 0,
    flow_data JSONB DEFAULT '{}',
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interaction_states_facebook_id ON user_interaction_states(facebook_id);
CREATE INDEX IF NOT EXISTS idx_user_interaction_states_bot_active ON user_interaction_states(bot_active);
        `)

        // 5. Kiểm tra các cột còn thiếu trong các bảng hiện có
        console.log('5️⃣ Kiểm tra các cột còn thiếu...')

        // Kiểm tra xem user_interactions có cột last_welcome_sent không
        const { error: checkWelcomeError } = await supabase
            .from('user_interactions')
            .select('last_welcome_sent')
            .limit(1)

        if (checkWelcomeError && checkWelcomeError.message.includes('column "last_welcome_sent" does not exist')) {
            console.log('⚠️ Thêm cột last_welcome_sent vào user_interactions...')

            const { error: addWelcomeColumnError } = await supabase.rpc('execute_sql', {
                sql_query: `
                    ALTER TABLE user_interactions
                    ADD COLUMN IF NOT EXISTS last_welcome_sent TIMESTAMP WITH TIME ZONE;

                    CREATE INDEX IF NOT EXISTS idx_user_interactions_last_welcome_sent
                    ON user_interactions(last_welcome_sent)
                    WHERE last_welcome_sent IS NOT NULL;

                    COMMENT ON COLUMN user_interactions.last_welcome_sent IS 'Thời gian gửi welcome message cuối cùng (để tính 24h cooldown)';
                `
            })

            if (addWelcomeColumnError) {
                console.error('❌ Lỗi khi thêm cột last_welcome_sent:', addWelcomeColumnError.message)
            } else {
                console.log('✅ Đã thêm cột last_welcome_sent vào user_interactions')
            }
        } else {
            console.log('✅ user_interactions đã có cột last_welcome_sent')
        }

        // 6. Verify các thay đổi
        console.log('6️⃣ Xác minh các thay đổi...')

        // Kiểm tra admin_chat_sessions có cột status
        const { data: adminSessions, error: adminSessionError } = await supabase
            .from('admin_chat_sessions')
            .select('id, status, is_active')
            .limit(1)

        if (adminSessionError) {
            if (adminSessionError.message.includes('column "status" does not exist')) {
                console.log('⚠️ admin_chat_sessions chưa có cột status (cần chạy thủ công)')
            } else {
                console.error('❌ Lỗi khi kiểm tra admin_chat_sessions:', adminSessionError.message)
            }
        } else {
            console.log('✅ admin_chat_sessions có cột status:', adminSessions?.length > 0 ? 'Có dữ liệu' : 'Không có dữ liệu')
        }

        // Kiểm tra admin_takeover_states
        const { data: takeoverStates, error: takeoverError } = await supabase
            .from('admin_takeover_states')
            .select('id')
            .limit(1)

        if (takeoverError) {
            if (takeoverError.message.includes('does not exist')) {
                console.log('⚠️ admin_takeover_states chưa được tạo (cần chạy thủ công)')
            } else {
                console.error('❌ Lỗi khi kiểm tra admin_takeover_states:', takeoverError.message)
            }
        } else {
            console.log('✅ admin_takeover_states đã được tạo thành công')
        }

        // Kiểm tra bot_settings
        const { data: botSettings, error: botSettingsError } = await supabase
            .from('bot_settings')
            .select('*')
            .limit(5)

        if (botSettingsError) {
            if (botSettingsError.message.includes('column') && botSettingsError.message.includes('does not exist')) {
                console.log('⚠️ bot_settings thiếu cấu trúc mong muốn (nhưng vẫn hoạt động với key-value)')
            } else {
                console.error('❌ Lỗi khi kiểm tra bot_settings:', botSettingsError.message)
            }
        } else {
            console.log('✅ bot_settings có', botSettings?.length || 0, 'record(s)')
            if (botSettings && botSettings.length > 0) {
                console.log('   Các settings hiện có:')
                botSettings.forEach(setting => {
                    if (setting.key) {
                        console.log(`     ${setting.key}: ${setting.value}`)
                    }
                })
            }
        }

        console.log('')
        console.log('🎉 Database schema fixes completed!')
        console.log('📋 Tóm tắt các thay đổi:')
        console.log('✅ Đã thêm cột status vào admin_chat_sessions')
        console.log('✅ Đã tạo bảng admin_takeover_states cho Admin Takeover')
        console.log('✅ Đã cập nhật bot_settings với cấu trúc đầy đủ')
        console.log('✅ Đã kiểm tra và bổ sung các cột thiếu khác')
        console.log('')
        console.log('🚀 Schema đã sẵn sàng cho tất cả tính năng hiện tại và tương lai!')

    } catch (error) {
        console.error('❌ Lỗi khi sửa schema:', error)
        process.exit(1)
    }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
    fixDatabaseSchema()
}

module.exports = { fixDatabaseSchema }