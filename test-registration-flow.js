// ========================================
// TEST REGISTRATION FLOW
// ========================================
// Script để test luồng đăng ký sau khi sửa lỗi

const { createClient } = require('@supabase/supabase-js')

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRegistrationFlow() {
    console.log('🧪 Testing Registration Flow...')

    const testFacebookId = 'test_user_' + Date.now()

    try {
        // 1. Test tạo session mới
        console.log('\n1. Testing create new session...')
        const sessionData = {
            current_flow: 'registration',
            step: 'name',
            data: {},
            started_at: new Date().toISOString()
        }

        const { data: createData, error: createError } = await supabase
            .from('bot_sessions')
            .upsert({
                facebook_id: testFacebookId,
                session_data: sessionData,
                current_flow: 'registration',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facebook_id'
            })
            .select()

        if (createError) {
            console.error('❌ Create session error:', createError)
            return
        }

        console.log('✅ Session created:', createData[0])

        // 2. Test update session (name step)
        console.log('\n2. Testing update session (name step)...')
        const nameData = {
            current_flow: 'registration',
            step: 'phone',
            data: { name: 'Test User' },
            started_at: new Date().toISOString()
        }

        const { data: updateData, error: updateError } = await supabase
            .from('bot_sessions')
            .upsert({
                facebook_id: testFacebookId,
                session_data: nameData,
                current_flow: 'registration',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facebook_id'
            })
            .select()

        if (updateError) {
            console.error('❌ Update session error:', updateError)
            return
        }

        console.log('✅ Session updated:', updateData[0])

        // 3. Test get session
        console.log('\n3. Testing get session...')
        const { data: getData, error: getError } = await supabase
            .from('bot_sessions')
            .select('*')
            .eq('facebook_id', testFacebookId)
            .single()

        if (getError) {
            console.error('❌ Get session error:', getError)
            return
        }

        console.log('✅ Session retrieved:', getData)

        // 4. Test multiple updates (phone step)
        console.log('\n4. Testing multiple updates (phone step)...')
        const phoneData = {
            current_flow: 'registration',
            step: 'location',
            data: { name: 'Test User', phone: '0123456789' },
            started_at: new Date().toISOString()
        }

        const { data: phoneUpdateData, error: phoneUpdateError } = await supabase
            .from('bot_sessions')
            .upsert({
                facebook_id: testFacebookId,
                session_data: phoneData,
                current_flow: 'registration',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facebook_id'
            })
            .select()

        if (phoneUpdateError) {
            console.error('❌ Phone update error:', phoneUpdateError)
            return
        }

        console.log('✅ Phone step updated:', phoneUpdateData[0])

        // 5. Verify only one record exists
        console.log('\n5. Verifying only one record exists...')
        const { data: allRecords, error: allRecordsError } = await supabase
            .from('bot_sessions')
            .select('*')
            .eq('facebook_id', testFacebookId)

        if (allRecordsError) {
            console.error('❌ Get all records error:', allRecordsError)
            return
        }

        console.log(`✅ Found ${allRecords.length} record(s) for test user`)
        if (allRecords.length === 1) {
            console.log('✅ SUCCESS: Only one record exists (no duplicates)')
        } else {
            console.log('❌ FAILURE: Multiple records exist (duplicates found)')
        }

        // 6. Cleanup test data
        console.log('\n6. Cleaning up test data...')
        const { error: deleteError } = await supabase
            .from('bot_sessions')
            .delete()
            .eq('facebook_id', testFacebookId)

        if (deleteError) {
            console.error('❌ Delete error:', deleteError)
        } else {
            console.log('✅ Test data cleaned up')
        }

        console.log('\n🎉 Registration flow test completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

// Chạy test
testRegistrationFlow()
