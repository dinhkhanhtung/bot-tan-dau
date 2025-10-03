const fs = require('fs')
const path = require('path')

// Path to .env file
const envPath = path.join(__dirname, '.env')

// Read current .env file
function readEnvFile() {
    try {
        if (fs.existsSync(envPath)) {
            return fs.readFileSync(envPath, 'utf8')
        }
        return ''
    } catch (error) {
        console.error('❌ Error reading .env file:', error)
        return ''
    }
}

// Write to .env file
function writeEnvFile(content) {
    try {
        fs.writeFileSync(envPath, content)
        console.log('✅ .env file updated successfully')
        return true
    } catch (error) {
        console.error('❌ Error writing .env file:', error)
        return false
    }
}

// Get current admin IDs
function getCurrentAdmins() {
    const envContent = readEnvFile()
    const match = envContent.match(/ADMIN_IDS=(.+)/)
    
    if (match) {
        return match[1].split(',').map(id => id.trim()).filter(id => id.length > 0)
    }
    
    return []
}

// Add admin ID
function addAdmin(facebookId) {
    const currentAdmins = getCurrentAdmins()
    
    if (currentAdmins.includes(facebookId)) {
        console.log(`⚠️  Admin ${facebookId} already exists`)
        return false
    }
    
    currentAdmins.push(facebookId)
    const newAdminIds = currentAdmins.join(',')
    
    let envContent = readEnvFile()
    
    if (envContent.includes('ADMIN_IDS=')) {
        // Update existing ADMIN_IDS
        envContent = envContent.replace(/ADMIN_IDS=.*/, `ADMIN_IDS=${newAdminIds}`)
    } else {
        // Add new ADMIN_IDS
        envContent += `\n# Admin Configuration\nADMIN_IDS=${newAdminIds}\n`
    }
    
    return writeEnvFile(envContent)
}

// Remove admin ID
function removeAdmin(facebookId) {
    const currentAdmins = getCurrentAdmins()
    
    if (!currentAdmins.includes(facebookId)) {
        console.log(`⚠️  Admin ${facebookId} not found`)
        return false
    }
    
    const newAdmins = currentAdmins.filter(id => id !== facebookId)
    const newAdminIds = newAdmins.join(',')
    
    let envContent = readEnvFile()
    envContent = envContent.replace(/ADMIN_IDS=.*/, `ADMIN_IDS=${newAdminIds}`)
    
    return writeEnvFile(envContent)
}

// List current admins
function listAdmins() {
    const admins = getCurrentAdmins()
    
    console.log('📋 Current admins in .env:')
    if (admins.length === 0) {
        console.log('📭 No admins found')
    } else {
        admins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin}`)
        })
    }
}

// Main function
function main() {
    const args = process.argv.slice(2)
    
    if (args.length === 0) {
        console.log('📖 Admin Management Tool')
        console.log('')
        console.log('Usage:')
        console.log('  node manage-admin.js list                    - List all admins')
        console.log('  node manage-admin.js add <facebook_id>       - Add new admin')
        console.log('  node manage-admin.js remove <facebook_id>    - Remove admin')
        console.log('')
        console.log('Examples:')
        console.log('  node manage-admin.js list')
        console.log('  node manage-admin.js add 31268544269455564')
        console.log('  node manage-admin.js remove 31298980306415271')
        return
    }

    const command = args[0]

    switch (command) {
        case 'list':
            listAdmins()
            break
            
        case 'add':
            if (args.length < 2) {
                console.error('❌ Usage: node manage-admin.js add <facebook_id>')
                return
            }
            const addId = args[1]
            if (addAdmin(addId)) {
                console.log(`✅ Admin ${addId} added successfully`)
                listAdmins()
            }
            break
            
        case 'remove':
            if (args.length < 2) {
                console.error('❌ Usage: node manage-admin.js remove <facebook_id>')
                return
            }
            const removeId = args[1]
            if (removeAdmin(removeId)) {
                console.log(`✅ Admin ${removeId} removed successfully`)
                listAdmins()
            }
            break
            
        default:
            console.error('❌ Unknown command:', command)
            console.log('Use "node manage-admin.js" without arguments to see usage')
    }
}

main()
