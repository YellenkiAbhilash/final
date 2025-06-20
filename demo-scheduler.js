const fs = require('fs');

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

// Simulate the scheduler logic
function simulateScheduler() {
    console.log('🎯 SCHEDULED CALLS DEMONSTRATION\n');
    
    const callsData = loadCalls();
    const now = new Date();
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Total calls: ${callsData.calls.length}\n`);
    
    let callsToMake = [];
    
    callsData.calls.forEach((call) => {
        const callTime = new Date(call.time);
        const timeDiff = callTime - now;
        const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
        const isDue = callTime <= now;
        
        console.log(`📞 Call ${call.id}: ${call.name} (${call.phone})`);
        console.log(`   Scheduled: ${callTime.toISOString()}`);
        console.log(`   Status: ${call.completed ? '✅ Completed' : call.failed ? '❌ Failed' : '⏳ Pending'}`);
        console.log(`   Time until call: ${minutesUntilCall} minutes`);
        console.log(`   Is due: ${isDue ? '✅ YES' : '⏰ NO'}`);
        
        if (!call.completed && !call.failed && isDue) {
            callsToMake.push(call);
            console.log(`   🚀 WILL MAKE CALL NOW`);
        } else if (!call.completed && !call.failed) {
            console.log(`   ⏰ Waiting for scheduled time`);
        }
        console.log('');
    });
    
    // Check Twilio configuration
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER;
    
    console.log('🔍 ANALYSIS:');
    console.log(`   Calls ready to make: ${callsToMake.length}`);
    console.log(`   Twilio configured: ${hasTwilio ? '✅ YES' : '❌ NO'}`);
    
    if (callsToMake.length > 0) {
        console.log('\n📋 CALLS THAT WOULD BE MADE:');
        callsToMake.forEach(call => {
            console.log(`   - ${call.name} (${call.phone})`);
        });
        
        if (!hasTwilio) {
            console.log('\n❌ WHY CALLS AREN\'T BEING MADE:');
            console.log('   Twilio is not configured!');
            console.log('   The scheduler is working correctly, but needs Twilio credentials.');
        } else {
            console.log('\n✅ CALLS WOULD BE MADE SUCCESSFULLY!');
        }
    } else {
        console.log('\n⏰ NO CALLS DUE AT THIS TIME');
    }
    
    console.log('\n🔧 TO FIX THIS:');
    console.log('1. Get Twilio credentials from https://www.twilio.com/');
    console.log('2. Create a .env file with:');
    console.log('   TWILIO_ACCOUNT_SID=your_account_sid');
    console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
    console.log('   TWILIO_PHONE_NUMBER=your_twilio_number');
    console.log('3. Restart the server');
    console.log('4. The scheduler will automatically make calls when due!');
}

// Run the demonstration
simulateScheduler(); 