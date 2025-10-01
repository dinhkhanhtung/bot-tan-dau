// Setup admin user script
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAdmin() {
    try {
        console.log('Setting up admin user...')
        
        // Add the user as admin
        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                facebook_id: '31268544269455564',
                name: 'Default Admin',
                role: 'super_admin',
                permissions: { all: true },
                is_active: true
            })
            .select()

        if (error) {
            if (error.code === '23505') {
                console.log('Admin user already exists')
            } else {
                console.error('Error adding admin user:', error)
                process.exit(1)
            }
        } else {
            console.log('Admin user added successfully:', data)
        }

        // Verify admin user
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('facebook_id', '31268544269455564')
            .single()

        if (adminError) {
            console.error('Error verifying admin user:', adminError)
            process.exit(1)
        }

        console.log('Admin user verified:', adminData)
        console.log('Setup completed successfully!')
        
    } catch (error) {
        console.error('Error in setup:', error)
        process.exit(1)
    }
}

setupAdmin()
