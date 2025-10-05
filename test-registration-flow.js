/**
 * Test script for registration flow
 * Run with: npx ts-node test-registration-flow.js
 */

import { AuthFlow } from './src/lib/flows/auth-flow';
import { getBotSession, updateBotSession } from './src/lib/database-service';

async function testRegistrationFlow() {
    console.log('🧪 Testing Registration Flow...\n');

    // Mock user object
    const mockUser = {
        facebook_id: 'test_user_123',
        status: 'new_user'
    };

    const authFlow = new AuthFlow();

    try {
        // Test 1: Start registration
        console.log('📝 Test 1: Starting registration...');
        await authFlow.handleRegistration(mockUser);
        console.log('✅ Registration started successfully\n');

        // Test 2: Check session was created
        console.log('📝 Test 2: Checking session creation...');
        const session = await getBotSession(mockUser.facebook_id);
        console.log('Session:', JSON.stringify(session, null, 2));

        if (session && session.current_flow === 'registration' && session.step === 0) {
            console.log('✅ Session created correctly\n');
        } else {
            console.log('❌ Session not created correctly\n');
        }

        // Test 3: Test name step
        console.log('📝 Test 3: Testing name input...');
        const nameInput = 'Nguyễn Văn Test';
        await authFlow.handleStep(mockUser, nameInput, session);
        console.log('✅ Name step completed\n');

        // Test 4: Check session after name step
        console.log('📝 Test 4: Checking session after name step...');
        const sessionAfterName = await getBotSession(mockUser.facebook_id);
        console.log('Session after name:', JSON.stringify(sessionAfterName, null, 2));

        if (sessionAfterName && sessionAfterName.step === 1 && sessionAfterName.data.name === nameInput) {
            console.log('✅ Name step processed correctly\n');
        } else {
            console.log('❌ Name step not processed correctly\n');
        }

        // Test 5: Test phone step
        console.log('📝 Test 5: Testing phone input...');
        const phoneInput = '0987654321';
        await authFlow.handleStep(mockUser, phoneInput, sessionAfterName);
        console.log('✅ Phone step completed\n');

        // Test 6: Check session after phone step
        console.log('📝 Test 6: Checking session after phone step...');
        const sessionAfterPhone = await getBotSession(mockUser.facebook_id);
        console.log('Session after phone:', JSON.stringify(sessionAfterPhone, null, 2));

        if (sessionAfterPhone && sessionAfterPhone.step === 2 && sessionAfterPhone.data.phone === phoneInput) {
            console.log('✅ Phone step processed correctly\n');
        } else {
            console.log('❌ Phone step not processed correctly\n');
        }

        // Test 7: Test location postback
        console.log('📝 Test 7: Testing location postback...');
        const locationInput = 'HÀ NỘI';
        await authFlow.handleLocationPostback(mockUser, locationInput);
        console.log('✅ Location postback completed\n');

        // Test 8: Check session after location step
        console.log('📝 Test 8: Checking session after location step...');
        const sessionAfterLocation = await getBotSession(mockUser.facebook_id);
        console.log('Session after location:', JSON.stringify(sessionAfterLocation, null, 2));

        if (sessionAfterLocation && sessionAfterLocation.step === 3 && sessionAfterLocation.data.location === locationInput) {
            console.log('✅ Location step processed correctly\n');
        } else {
            console.log('❌ Location step not processed correctly\n');
        }

        // Test 9: Test birthday verification
        console.log('📝 Test 9: Testing birthday verification...');
        await authFlow.handleBirthdayVerification(mockUser, 'YES');
        console.log('✅ Birthday verification completed\n');

        // Test 10: Check if user was created
        console.log('📝 Test 10: Checking if user was created...');
        const { supabaseAdmin } = await import('./src/lib/supabase');
        const { data: createdUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('facebook_id', mockUser.facebook_id)
            .single();

        if (createdUser) {
            console.log('✅ User created successfully:', createdUser.name);
            console.log('📧 Phone:', createdUser.phone);
            console.log('📍 Location:', createdUser.location);
            console.log('🎂 Birthday:', createdUser.birthday);
            console.log('🏷️ Status:', createdUser.status);
        } else {
            console.log('❌ User not created');
        }

        // Test 11: Check if session was cleared
        console.log('📝 Test 11: Checking if session was cleared...');
        const finalSession = await getBotSession(mockUser.facebook_id);
        if (!finalSession) {
            console.log('✅ Session cleared successfully');
        } else {
            console.log('❌ Session not cleared');
        }

        console.log('\n🎉 Registration flow test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testRegistrationFlow();
