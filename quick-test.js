// Quick test for admin login issue
const https = require('https');

async function testAdminLogin() {
    console.log('🧪 Testing admin login...');

    // Test 1: Check if login page loads
    console.log('\n1. Testing login page...');
    try {
        const pageResponse = await fetch('https://bot-tan-dau.vercel.app/admin/login');
        console.log('✅ Login page status:', pageResponse.status);
    } catch (error) {
        console.log('❌ Login page error:', error.message);
    }

    // Test 2: Test API login
    console.log('\n2. Testing API login...');
    try {
        const apiResponse = await fetch('https://bot-tan-dau.vercel.app/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const data = await apiResponse.json();
        console.log('API Status:', apiResponse.status);
        console.log('API Response:', data);

        if (data.success) {
            console.log('✅ API login works!');

            // Test 3: Test dashboard access
            console.log('\n3. Testing dashboard access...');
            const dashboardResponse = await fetch('https://bot-tan-dau.vercel.app/admin/dashboard', {
                headers: {
                    'Cookie': `admin_token=${data.token}`,
                    'Authorization': `Bearer ${data.token}`
                }
            });
            console.log('Dashboard status:', dashboardResponse.status);

            if (dashboardResponse.status === 200) {
                console.log('✅ Dashboard accessible with token');
            } else {
                console.log('❌ Dashboard not accessible');
            }
        } else {
            console.log('❌ API login failed:', data.message);
        }
    } catch (error) {
        console.log('❌ API error:', error.message);
    }
}

testAdminLogin();
