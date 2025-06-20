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
    console.log('🧪 Testing Scheduler Logic\n');
    
    const callsData = loadCalls();
    const now = new Date();
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Total calls: ${callsData.calls.length}\n`);
    
    callsData.calls.forEach((call, index) => {
        const callTime = new Date(call.time);
        const timeDiff = callTime - now;
        const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
        const isDue = callTime <= now;
        
        console.log(`Call ${call.id}: ${call.name} (${call.phone})`);
        console.log(`  Scheduled: ${callTime.toISOString()}`);
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