// Test script for BOT TÂN DẬU 1981
// Run with: node test-bot.js

const axios = require('axios');

const BOT_URL = 'http://localhost:3000/api/webhook';
const TEST_USER_ID = 'test_user_123';

// Test data
const testEvents = [
    // Test webhook verification
    {
        type: 'GET',
        url: `${BOT_URL}?hub.mode=subscribe&hub.verify_token=my_verify_token_123&hub.challenge=test_challenge`
    },

    // Test message event
    {
        type: 'POST',
        url: BOT_URL,
        data: {
            object: 'page',
            entry: [{
                messaging: [{
                    sender: { id: TEST_USER_ID },
                    message: { text: 'Xin chào' }
                }]
            }]
        }
    },

    // Test registration flow
    {
        type: 'POST',
        url: BOT_URL,
        data: {
            object: 'page',
            entry: [{
                messaging: [{
                    sender: { id: TEST_USER_ID },
                    message: { text: 'Đăng ký' }
                }]
            }]
        }
    },

    // Test postback event
    {
        type: 'POST',
        url: BOT_URL,
        data: {
            object: 'page',
            entry: [{
                messaging: [{
                    sender: { id: TEST_USER_ID },
                    postback: { payload: 'REGISTER' }
                }]
            }]
        }
    }
];

async function testBot() {
    console.log('🤖 Testing BOT TÂN DẬU 1981...\n');

    for (let i = 0; i < testEvents.length; i++) {
        const test = testEvents[i];
        console.log(`Test ${i + 1}: ${test.type} ${test.url}`);

        try {
            let response;
            if (test.type === 'GET') {
                response = await axios.get(test.url);
            } else {
                response = await axios.post(test.url, test.data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-hub-signature-256': 'sha256=test_signature'
                    }
                });
            }

            console.log(`✅ Status: ${response.status}`);
            console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.log('');
        }
    }

    console.log('🏁 Testing completed!');
}

// Run tests
testBot().catch(console.error);
