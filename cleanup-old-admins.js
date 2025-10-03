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

async function cleanupOldAdmins() {
    console.log('🧹 Cleaning up old admins...');

    // Current valid admin IDs from environment
    const currentAdminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];

    if (currentAdminIds.length === 0) {
        console.error('❌ No ADMIN_IDS found in environment variables');
        return;
    }

    console.log(`📋 Current valid admin IDs:`, currentAdminIds);

    try {
        // Get all admins from database
        const { data: allAdmins, error: fetchError } = await supabase
            .from('admin_users')
            .select('*');

        if (fetchError) {
            console.error('❌ Error fetching admins:', fetchError);
            return;
        }

        console.log(`📊 Found ${allAdmins.length} admins in database`);

        let deletedCount = 0;
        let keptCount = 0;

        for (const admin of allAdmins) {
            if (currentAdminIds.includes(admin.facebook_id)) {
                console.log(`✅ Keeping valid admin: ${admin.facebook_id}`);
                keptCount++;
            } else {
                console.log(`❌ Removing old admin: ${admin.facebook_id}`);

                // Delete old admin
                const { error: deleteError } = await supabase
                    .from('admin_users')
                    .delete()
                    .eq('facebook_id', admin.facebook_id);

                if (deleteError) {
                    console.error(`❌ Error deleting admin ${admin.facebook_id}:`, deleteError);
                } else {
                    console.log(`✅ Successfully deleted old admin: ${admin.facebook_id}`);
                    deletedCount++;
                }
            }
        }

        console.log(`🎉 Cleanup completed!`);
        console.log(`✅ Kept: ${keptCount} valid admins`);
        console.log(`🗑️ Deleted: ${deletedCount} old admins`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

// Run the function
cleanupOldAdmins().catch(console.error);
