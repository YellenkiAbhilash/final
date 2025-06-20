const fs = require('fs');
const path = require('path');

// Load calls data
function loadCalls() {
    try {
        const data = fs.readFileSync('calls.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading calls:', error);
        return { calls: [] };
    }
}

// Test the scheduler logic
function testScheduler() {
    console.log('🧪 Testing Scheduler Logic (IST TIMEZONE)\n');
    
    const callsData = loadCalls();
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    console.log(`Current time (UTC): ${now.toISOString()}`);
    console.log(`Current time (IST): ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Total calls: ${callsData.calls.length}\n`);
    
    callsData.calls.forEach((call, index) => {
        const callTime = new Date(call.time);
        const callTimeIST = new Date(callTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const timeDiff = callTimeIST - istTime;
        const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
        const isDue = callTimeIST <= istTime;
        
        console.log(`Call ${call.id}: ${call.name} (${call.phone})`);
        console.log(`  Scheduled (IST): ${callTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`  Status: ${call.completed ? '✅ Completed' : call.failed ? '❌ Failed' : '⏳ Pending'}`);
        console.log(`  Time until call: ${minutesUntilCall} minutes`);
        console.log(`  Is due: ${isDue ? '✅ YES' : '⏰ NO'}`);
        
        if (!call.completed && !call.failed && isDue) {
            console.log(`  🚀 WOULD MAKE CALL NOW`);
        } else if (!call.completed && !call.failed) {
            console.log(`  ⏰ Waiting for scheduled time`);
        }
        console.log('');
    });
    
    // Check if Twilio would be available
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER;
    console.log(`Twilio configured: ${hasTwilio ? '✅ YES' : '❌ NO'}`);
    
    if (!hasTwilio) {
        console.log('\nTo enable Twilio:');
        console.log('1. Create a .env file with your Twilio credentials');
        console.log('2. Get credentials from https://www.twilio.com/');
        console.log('3. Restart the server');
    }
}

// Run the test
testScheduler();

// Test script to create a call scheduled for current IST time
function saveCalls(callsData) {
    fs.writeFileSync('calls.json', JSON.stringify(callsData, null, 2));
}

function createTestCall() {
    const callsData = loadCalls();
    
    // Create a call scheduled for current IST time (add 1 minute to ensure it's in the future)
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const scheduledTime = new Date(istTime.getTime() + 1 * 60 * 1000); // Add 1 minute
    
    const testCall = {
        id: `test-${Date.now()}`,
        name: 'Test User IST',
        phone: '+919876543210', // Replace with a real number for testing
        time: scheduledTime.toISOString(),
        completed: false,
        failed: false,
        created_at: new Date().toISOString()
    };
    
    callsData.calls.push(testCall);
    saveCalls(callsData);
    
    console.log('🧪 TEST CALL CREATED FOR IST TIME');
    console.log(`📞 Name: ${testCall.name}`);
    console.log(`📱 Phone: ${testCall.phone}`);
    console.log(`⏰ Scheduled (IST): ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`🆔 Call ID: ${testCall.id}`);
    console.log('\n✅ The scheduler will make this call in about 1 minute!');
    console.log('   Make sure Twilio is configured in your .env file.');
}

createTestCall(); 