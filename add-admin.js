const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAdminsToDatabase() {
    console.log('🔧 Adding admins to database...');

    // Admin IDs from environment variable
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];

    if (adminIds.length === 0) {
        console.error('❌ No ADMIN_IDS found in environment variables');
        return;
    }

    console.log(`📋 Found ${adminIds.length} admin IDs:`, adminIds);

    for (const facebookId of adminIds) {
        try {
            // Check if admin already exists
            const { data: existingAdmin, error: checkError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('facebook_id', facebookId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
                console.error(`❌ Error checking admin ${facebookId}:`, checkError);
                continue;
            }

            if (existingAdmin) {
                console.log(`✅ Admin ${facebookId} already exists in database`);
                continue;
            }

            // Add new admin
            const { data, error } = await supabase
                .from('admin_users')
                .insert({
                    facebook_id: facebookId,
                    name: `Admin ${facebookId.slice(-6)}`,
                    role: 'admin',
                    permissions: { all: true },
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error(`❌ Error adding admin ${facebookId}:`, error);
            } else {
                console.log(`✅ Successfully added admin ${facebookId} to database`);
            }
        } catch (error) {
            console.error(`❌ Unexpected error with admin ${facebookId}:`, error);
        }
    }

    console.log('🎉 Admin setup completed!');
}

// Run the function
addAdminsToDatabase().catch(console.error);
