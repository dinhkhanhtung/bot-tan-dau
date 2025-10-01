// Database check script for BOT TÂN DẬU 1981
// Run with: node check-database.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_role_key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('🗄️ Checking BOT TÂN DẬU 1981 Database...\n');

    try {
        // Check if tables exist
        const tables = [
            'users', 'listings', 'conversations', 'messages', 'payments',
            'ratings', 'events', 'notifications', 'ads', 'search_requests',
            'referrals', 'user_points', 'point_transactions', 'bot_sessions'
        ];

        console.log('📋 Checking tables...');
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`❌ Table ${table}: ${error.message}`);
                } else {
                    console.log(`✅ Table ${table}: OK`);
                }
            } catch (err) {
                console.log(`❌ Table ${table}: ${err.message}`);
            }
        }

        console.log('\n📊 Checking data...');

        // Check users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (usersError) {
            console.log(`❌ Users table error: ${usersError.message}`);
        } else {
            console.log('✅ Users table: OK');
        }

        // Check listings
        const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('count')
            .limit(1);

        if (listingsError) {
            console.log(`❌ Listings table error: ${listingsError.message}`);
        } else {
            console.log('✅ Listings table: OK');
        }

        // Check payments
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('count')
            .limit(1);

        if (paymentsError) {
            console.log(`❌ Payments table error: ${paymentsError.message}`);
        } else {
            console.log('✅ Payments table: OK');
        }

        console.log('\n🎯 Database check completed!');

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

// Run check
checkDatabase().catch(console.error);
