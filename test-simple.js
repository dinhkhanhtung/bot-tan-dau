console.log('Testing admin login...');

// Simple fetch test
fetch('https://bot-tan-dau.vercel.app/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
    .then(response => response.json())
    .then(data => {
        console.log('API Response:', data);
        if (data.success) {
            console.log('✅ Login API works!');
        } else {
            console.log('❌ Login failed:', data.message);
        }
    })
    .catch(error => {
        console.log('❌ Error:', error.message);
    });
