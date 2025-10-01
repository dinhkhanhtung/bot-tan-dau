const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration!')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addAdmin(facebookId, name, role = 'admin') {
    try {
        console.log(`🔄 Adding admin: ${name} (${facebookId})`)

        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                facebook_id: facebookId,
                name: name,
                role: role,
                permissions: role === 'super_admin' ? { all: true } : {},
                is_active: true,
                created_at: new Date().toISOString()
            })
            .select()

        if (error) {
            console.error('❌ Error adding admin:', error)
            return false
        }

        console.log('✅ Admin added successfully:', data)
        return true
    } catch (error) {
        console.error('❌ Error in addAdmin:', error)
        return false
    }
}

async function listAdmins() {
    try {
        console.log('📋 Current admins:')

        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error listing admins:', error)
            return
        }

        if (!data || data.length === 0) {
            console.log('📭 No admins found')
            return
        }

        data.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.name} (${admin.role})`)
            console.log(`   ID: ${admin.facebook_id}`)
            console.log(`   Active: ${admin.is_active ? '✅' : '❌'}`)
            console.log(`   Created: ${new Date(admin.created_at).toLocaleString('vi-VN')}`)
            console.log('')
        })
    } catch (error) {
        console.error('❌ Error in listAdmins:', error)
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.log('📖 Usage:')
        console.log('  node add-admin.js list                    - List all admins')
        console.log('  node add-admin.js add <facebook_id> <name> [role] - Add new admin')
        console.log('')
        console.log('Examples:')
        console.log('  node add-admin.js list')
        console.log('  node add-admin.js add 31268544269455564 "Admin Name"')
        console.log('  node add-admin.js add 31298980306415271 "Super Admin" super_admin')
        return
    }

    const command = args[0]

    if (command === 'list') {
        await listAdmins()
    } else if (command === 'add') {
        if (args.length < 3) {
            console.error('❌ Usage: node add-admin.js add <facebook_id> <name> [role]')
            return
        }

        const facebookId = args[1]
        const name = args[2]
        const role = args[3] || 'admin'

        await addAdmin(facebookId, name, role)
    } else {
        console.error('❌ Unknown command:', command)
        console.log('Use "node add-admin.js" without arguments to see usage')
    }
}

main().catch(console.error)
