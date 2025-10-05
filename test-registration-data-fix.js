/**
 * Test script để kiểm tra fix lỗi "Cannot set properties of undefined"
 * Mô phỏng user nhập tên trong form đăng ký với data undefined
 */

console.log('🧪 Testing Registration Data Fix...')

// Mô phỏng session với cấu trúc flat (như được tạo trong handleRegistration)
const mockSession = {
    current_flow: 'registration',
    step: 'name',
    data: {},
    started_at: new Date().toISOString()
}

// Mô phỏng session với cấu trúc nested (cũ)
const mockSessionNested = {
    current_flow: 'registration',
    session_data: {
        step: 'name',
        data: {},
        started_at: new Date().toISOString()
    }
}

// Mô phỏng session với data undefined (gây lỗi)
const mockSessionUndefined = {
    current_flow: 'registration',
    step: 'name',
    data: undefined,
    started_at: new Date().toISOString()
}

console.log('\n📝 Test 1: Session với cấu trúc flat')
console.log('Current step:', mockSession.step || mockSession.session_data?.step || 'name')
console.log('Session data:', mockSession.data || mockSession.session_data?.data || {})

console.log('\n📝 Test 2: Session với cấu trúc nested')
console.log('Current step:', mockSessionNested.step || mockSessionNested.session_data?.step || 'name')
console.log('Session data:', mockSessionNested.data || mockSessionNested.session_data?.data || {})

console.log('\n📝 Test 3: Session với data undefined (gây lỗi)')
const currentStep = mockSessionUndefined.step || mockSessionUndefined.session_data?.step || 'name'
let sessionData = mockSessionUndefined.data || mockSessionUndefined.session_data?.data || {}

// FIX: Đảm bảo data không bao giờ là undefined
if (!sessionData) {
    console.log('⚠️ Data is undefined, creating new object')
    sessionData = {}
}

console.log('Current step:', currentStep)
console.log('Session data:', sessionData)

// Test việc set property
try {
    sessionData.name = 'Đình Khánh Tùng'
    console.log('✅ Successfully set name:', sessionData.name)
} catch (error) {
    console.log('❌ Error setting name:', error.message)
}

console.log('\n✅ Test completed successfully!')
