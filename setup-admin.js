const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Please set:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDefaultAdmin() {
    try {
        console.log('🔧 Setting up default admin user...')

        // Check if admin already exists
        const { data: existingAdmin } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', 'admin')
            .single()

        if (existingAdmin) {
            console.log('✅ Admin user already exists')
            return
        }

        // Hash password
        const password = 'admin123' // Default password
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // Create admin user
        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                username: 'admin',
                password_hash: passwordHash,
                name: 'Administrator',
                email: 'admin@bottandau.com',
                role: 'super_admin',
                permissions: { all: true },
                is_active: true
            })
            .select()

        if (error) {
            console.error('❌ Error creating admin user:', error)
            return
        }

        console.log('✅ Default admin user created successfully!')
        console.log('👤 Username: admin')
        console.log('🔑 Password: admin123')
        console.log('⚠️  Please change the password after first login!')

    } catch (error) {
        console.error('❌ Setup failed:', error)
    }
}

async function setupEnvironmentVariables() {
    console.log('🔧 Setting up environment variables...')

    // Check if .env file exists
    const fs = require('fs')
    const path = require('path')

    const envPath = path.join(__dirname, '.env')
    const envExamplePath = path.join(__dirname, 'env.example')

    // Read existing .env file or create from example
    let envContent = ''
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8')
    } else if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8')
    }

    // Check for JWT_SECRET
    if (!envContent.includes('JWT_SECRET=')) {
        const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-' + Date.now()
        envContent += `\nJWT_SECRET="${jwtSecret}"`

        fs.writeFileSync(envPath, envContent)
        console.log('✅ JWT_SECRET added to .env file')
    } else {
        console.log('✅ JWT_SECRET already exists in .env file')
    }

    // Check for other required variables
    const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'FACEBOOK_APP_ID',
        'FACEBOOK_APP_SECRET',
        'NEXT_PUBLIC_APP_URL'
    ]

    let missingVars = []
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName)
        }
    })

    if (missingVars.length > 0) {
        console.log('⚠️  Missing environment variables:', missingVars.join(', '))
        console.log('Please set these in your .env file')
    } else {
        console.log('✅ All required environment variables are set')
    }
}

async function main() {
    console.log('🚀 Starting BOT Tân Dậu Admin Setup...\n')

    await setupEnvironmentVariables()
    console.log('')

    await createDefaultAdmin()
    console.log('')

    console.log('🎉 Setup completed!')
    console.log('🌐 You can now access the admin panel at: http://localhost:3000/admin/login')
    console.log('📝 Default credentials:')
    console.log('   Username: admin')
    console.log('   Password: admin123')
    console.log('')
    console.log('🔒 Remember to:')
    console.log('   1. Change the default password after first login')
    console.log('   2. Update JWT_SECRET in production')
    console.log('   3. Set all required environment variables')
}

main()
