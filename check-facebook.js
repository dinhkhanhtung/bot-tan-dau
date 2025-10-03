// Facebook API check script for BOT Tân Dậu - Hỗ Trợ Chéo
// Run with: node check-facebook.js

const axios = require('axios');

// Replace with your Facebook credentials
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'your_access_token';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'your_app_id';

const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';

async function checkFacebookAPI() {
    console.log('📱 Checking Facebook API...\n');

    try {
        // Check access token
        console.log('🔑 Checking access token...');
        const tokenResponse = await axios.get(
            `${FACEBOOK_API_URL}/me`,
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN }
            }
        );

        console.log('✅ Access token valid');
        console.log(`App: ${tokenResponse.data.name} (ID: ${tokenResponse.data.id})`);

        // Check app info
        console.log('\n📱 Checking app info...');
        const appResponse = await axios.get(
            `${FACEBOOK_API_URL}/${FACEBOOK_APP_ID}`,
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN }
            }
        );

        console.log('✅ App info retrieved');
        console.log(`App Name: ${appResponse.data.name}`);
        console.log(`App Type: ${appResponse.data.category}`);

        // Check pages
        console.log('\n📄 Checking pages...');
        const pagesResponse = await axios.get(
            `${FACEBOOK_API_URL}/me/accounts`,
            {
                params: { access_token: FACEBOOK_ACCESS_TOKEN }
            }
        );

        if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
            console.log('✅ Pages found:');
            pagesResponse.data.data.forEach(page => {
                console.log(`  - ${page.name} (ID: ${page.id})`);
            });
        } else {
            console.log('⚠️ No pages found');
        }

        // Test sending message (optional)
        console.log('\n💬 Testing message sending...');
        const testMessage = {
            recipient: { id: 'test_user_123' },
            message: { text: 'Test message from BOT Tân Dậu - Hỗ Trợ Chéo' }
        };

        try {
            const messageResponse = await axios.post(
                `${FACEBOOK_API_URL}/me/messages`,
                testMessage,
                {
                    params: { access_token: FACEBOOK_ACCESS_TOKEN },
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            console.log('✅ Message sent successfully');
            console.log(`Message ID: ${messageResponse.data.message_id}`);
        } catch (messageError) {
            console.log('⚠️ Message sending failed (this is normal for test)');
            console.log(`Error: ${messageError.response?.data?.error?.message || messageError.message}`);
        }

        console.log('\n🎯 Facebook API check completed!');

    } catch (error) {
        console.error('❌ Facebook API check failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

// Run check
checkFacebookAPI().catch(console.error);
