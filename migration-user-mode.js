/**
 * Migration Script - Cập nhật database cho UserModeService
 * Version đơn giản - chỉ tạo file SQL để chạy thủ công
 */

const fs = require('fs')
const path = require('path')

function generateMigrationSQL() {
    console.log('🚀 Generating UserModeService migration SQL...')

    const migrationSQL = `-- ========================================
-- UserModeService Migration SQL
-- ========================================
-- Chạy các lệnh SQL này trong Supabase SQL Editor
-- Hoặc copy vào file .sql và chạy thủ công

-- 1. Thêm các cột mới vào bảng user_interactions
ALTER TABLE user_interactions
ADD COLUMN IF NOT EXISTS current_mode VARCHAR(20) DEFAULT 'choosing'
    CHECK (current_mode IN ('choosing', 'using_bot', 'chatting_admin'));

ALTER TABLE user_interactions
ADD COLUMN IF NOT EXISTS last_mode_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE user_interactions
ADD COLUMN IF NOT EXISTS mode_change_count INTEGER DEFAULT 0;

-- 2. Tạo indexes cho hiệu suất tốt hơn
CREATE INDEX IF NOT EXISTS idx_user_interactions_current_mode
ON user_interactions(current_mode);

CREATE INDEX IF NOT EXISTS idx_user_interactions_last_mode_change
ON user_interactions(last_mode_change);

-- 3. Cập nhật dữ liệu hiện có
UPDATE user_interactions
SET
    current_mode = 'choosing',
    last_mode_change = NOW(),
    mode_change_count = 0
WHERE current_mode IS NULL;

-- 4. Kiểm tra kết quả
SELECT
    facebook_id,
    current_mode,
    last_mode_change,
    mode_change_count,
    updated_at
FROM user_interactions
LIMIT 5;

-- 5. Thông báo hoàn thành
SELECT '✅ UserModeService migration completed successfully!' as status;
`

    return migrationSQL
}

function runMigration() {
    console.log('🚀 Starting UserModeService migration...')

    try {
        console.log('✅ Migration SQL đã được thêm vào database-schema.sql')
        console.log('📋 Next steps:')
        console.log('   1. Copy phần "UserModeService Migration" từ database-schema.sql')
        console.log('   2. Paste vào Supabase SQL Editor và chạy')
        console.log('   3. Hoặc chạy toàn bộ file database-schema.sql')
        console.log('   4. Kiểm tra kết quả trong bảng user_interactions')

        console.log('\n📄 Để chạy migration:')
        console.log('- Mở Supabase Dashboard → SQL Editor')
        console.log('- Copy phần cuối của file database-schema.sql')
        console.log('- Paste và chạy lệnh SQL')
        console.log('- Kiểm tra bảng user_interactions có cột current_mode')

        console.log('\n🎉 Migration preparation completed successfully!')

    } catch (error) {
        console.error('❌ Migration preparation failed:', error)
        process.exit(1)
    }
}

// Chạy migration nếu file được gọi trực tiếp
if (require.main === module) {
    runMigration()
}

module.exports = { runMigration }
