const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testMiddleware() {
    console.log('🔍 Testing middleware behavior...');

    // Test 1: Access dashboard without token
    console.log('\n1. Testing dashboard without token...');
    try {
        const response = await fetch('https://bot-tan-dau.vercel.app/admin/dashboard', {
            redirect: 'manual' // Don't follow redirects
        });

        console.log('Status:', response.status);
        console.log('Location header:', response.headers.get('location'));

        if (response.status === 302) {
            console.log('✅ Middleware working: Redirected to login');
        } else if (response.status === 200) {
            console.log('❌ Middleware not working: Dashboard accessible without token');
        } else {
            console.log('⚠️ Unexpected status:', response.status);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 2: Access dashboard with invalid token
    console.log('\n2. Testing dashboard with invalid token...');
    try {
        const response = await fetch('https://bot-tan-dau.vercel.app/admin/dashboard', {
            headers: {
                'Cookie': 'admin_token=invalid_token',
                'Authorization': 'Bearer invalid_token'
            },
            redirect: 'manual'
        });

        console.log('Status:', response.status);
        console.log('Location header:', response.headers.get('location'));

        if (response.status === 302) {
            console.log('✅ Middleware working: Invalid token redirected');
        } else if (response.status === 200) {
            console.log('❌ Middleware not working: Dashboard accessible with invalid token');
        } else {
            console.log('⚠️ Unexpected status:', response.status);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 3: Get valid token and test
    console.log('\n3. Testing with valid token...');
    try {
        const loginResponse = await fetch('https://bot-tan-dau.vercel.app/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            if (loginData.success && loginData.token) {
                console.log('✅ Got valid token');

                // Test dashboard with valid token
                const dashboardResponse = await fetch('https://bot-tan-dau.vercel.app/admin/dashboard', {
                    headers: {
                        'Cookie': `admin_token=${loginData.token}`,
                        'Authorization': `Bearer ${loginData.token}`
                    }
                });

                console.log('Dashboard with valid token status:', dashboardResponse.status);

                if (dashboardResponse.ok) {
                    console.log('✅ Dashboard accessible with valid token');
                } else {
                    console.log('❌ Dashboard not accessible with valid token');
                }
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testMiddleware();
