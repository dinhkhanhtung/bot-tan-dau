// System check script for BOT Tân Dậu - Hỗ Trợ Chéo
// Run with: node check-system.js

const fs = require('fs');
const path = require('path');

function checkSystem() {
    console.log('🔍 Checking BOT Tân Dậu - Hỗ Trợ Chéo System...\n');

    // Check required files
    const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'next.config.js',
        'tailwind.config.ts',
        'postcss.config.js',
        '.eslintrc.json',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/globals.css',
        'src/lib/supabase.ts',
        'src/lib/constants.ts',
        'src/lib/utils.ts',
        'src/lib/facebook-api.ts',
        'src/lib/bot-handlers.ts',
        'src/lib/bot-flows.ts',
        'src/lib/admin-handlers.ts',
        'src/types/index.ts',
        'src/middleware.ts',
        'src/app/api/webhook/route.ts',
        'src/app/api/users/route.ts',
        'src/app/api/listings/route.ts',
        'src/app/api/payments/route.ts',
        'src/app/api/conversations/route.ts',
        'src/app/api/ratings/route.ts',
        'src/app/api/notifications/route.ts',
        'src/app/api/stats/route.ts',
        'src/app/api/events/route.ts',
        'src/app/api/events/participants/route.ts',
        'src/app/api/ads/route.ts',
        'src/app/api/search-requests/route.ts',
        'src/app/api/referrals/route.ts',
        'src/app/api/points/route.ts',
        'src/app/api/messages/route.ts',
        'src/app/api/auth/facebook/route.ts',
        'database-schema.sql',
        'README.md',
        'DEPLOYMENT.md'
    ];

    console.log('📁 Checking required files...');
    let missingFiles = [];

    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - MISSING`);
            missingFiles.push(file);
        }
    }

    if (missingFiles.length > 0) {
        console.log(`\n⚠️ Missing ${missingFiles.length} files:`);
        missingFiles.forEach(file => console.log(`  - ${file}`));
    } else {
        console.log('\n✅ All required files present!');
    }

    // Check package.json
    console.log('\n📦 Checking package.json...');
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        const requiredDeps = [
            'next', 'react', 'react-dom', '@supabase/supabase-js',
            'axios', 'date-fns', 'lodash', 'uuid', 'clsx', 'tailwind-merge'
        ];

        const requiredDevDeps = [
            '@types/node', '@types/react', '@types/react-dom',
            '@types/lodash', '@types/uuid', 'eslint', 'eslint-config-next',
            'typescript', 'tailwindcss', 'autoprefixer', 'postcss'
        ];

        console.log('Dependencies:');
        requiredDeps.forEach(dep => {
            if (packageJson.dependencies[dep]) {
                console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
            } else {
                console.log(`  ❌ ${dep}: MISSING`);
            }
        });

        console.log('Dev Dependencies:');
        requiredDevDeps.forEach(dep => {
            if (packageJson.devDependencies[dep]) {
                console.log(`  ✅ ${dep}: ${packageJson.devDependencies[dep]}`);
            } else {
                console.log(`  ❌ ${dep}: MISSING`);
            }
        });

    } catch (error) {
        console.log(`❌ Error reading package.json: ${error.message}`);
    }

    // Check environment variables
    console.log('\n🔐 Checking environment variables...');
    const envFile = '.env.local';
    if (fs.existsSync(envFile)) {
        console.log('✅ .env.local exists');

        const envContent = fs.readFileSync(envFile, 'utf8');
        const requiredEnvVars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'FACEBOOK_APP_ID',
            'FACEBOOK_APP_SECRET',
            'FACEBOOK_ACCESS_TOKEN',
            'FACEBOOK_VERIFY_TOKEN'
        ];

        requiredEnvVars.forEach(envVar => {
            if (envContent.includes(envVar)) {
                console.log(`  ✅ ${envVar}`);
            } else {
                console.log(`  ❌ ${envVar} - MISSING`);
            }
        });
    } else {
        console.log('❌ .env.local not found');
        console.log('  Please copy env.example to .env.local and configure it');
    }

    // Check database schema
    console.log('\n🗄️ Checking database schema...');
    if (fs.existsSync('database-schema.sql')) {
        const schemaContent = fs.readFileSync('database-schema.sql', 'utf8');
        const requiredTables = [
            'users', 'listings', 'conversations', 'messages', 'payments',
            'ratings', 'events', 'notifications', 'ads', 'search_requests',
            'referrals', 'user_points', 'point_transactions', 'bot_sessions'
        ];

        requiredTables.forEach(table => {
            if (schemaContent.includes(`CREATE TABLE ${table}`)) {
                console.log(`  ✅ Table ${table}`);
            } else {
                console.log(`  ❌ Table ${table} - MISSING`);
            }
        });
    } else {
        console.log('❌ database-schema.sql not found');
    }

    // Check API routes
    console.log('\n🛣️ Checking API routes...');
    const apiDir = 'src/app/api';
    if (fs.existsSync(apiDir)) {
        const apiRoutes = fs.readdirSync(apiDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const expectedRoutes = [
            'webhook', 'users', 'listings', 'payments', 'conversations',
            'ratings', 'notifications', 'stats', 'events', 'ads',
            'search-requests', 'referrals', 'points', 'messages', 'auth'
        ];

        expectedRoutes.forEach(route => {
            if (apiRoutes.includes(route)) {
                console.log(`  ✅ /api/${route}`);
            } else {
                console.log(`  ❌ /api/${route} - MISSING`);
            }
        });
    } else {
        console.log('❌ API directory not found');
    }

    console.log('\n🎯 System check completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Configure .env.local');
    console.log('3. Setup Supabase database');
    console.log('4. Setup Facebook App');
    console.log('5. Run: npm run dev');
    console.log('6. Test with: node test-bot.js');
}

// Run check
checkSystem();