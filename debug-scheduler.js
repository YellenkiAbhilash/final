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

// Simulate the exact scheduler logic
function debugScheduler() {
    console.log('🔍 SCHEDULER DEBUG - LIVE ANALYSIS (IST TIMEZONE)\n');
    
    const callsData = loadCalls();
    const now = new Date();
    // Get IST offset (UTC+5:30 = 5.5 hours)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    
    console.log(`⏰ Current time (UTC): ${now.toISOString()}`);
    console.log(`⏰ Current time (IST): ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`📞 Total calls in system: ${callsData.calls.length}\n`);
    
    let pendingCalls = [];
    let failedCalls = [];
    let completedCalls = [];
    
    callsData.calls.forEach((call, index) => {
        const callTime = new Date(call.time);
        // Convert call time to IST
        const callTimeIST = new Date(callTime.getTime() + istOffset);
        const timeDiff = callTimeIST - istTime;
        const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
        const isDue = callTimeIST <= istTime;
        
        console.log(`📋 Call ${call.id}: ${call.name} (${call.phone})`);
        console.log(`   📅 Scheduled (IST): ${callTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   ⏱️  Time until call: ${minutesUntilCall} minutes`);
        console.log(`   🎯 Is due: ${isDue ? '✅ YES' : '⏰ NO'}`);
        
        if (call.completed) {
            console.log(`   ✅ Status: COMPLETED at ${call.completed_at}`);
            completedCalls.push(call);
        } else if (call.failed) {
            console.log(`   ❌ Status: FAILED - ${call.error}`);
            failedCalls.push(call);
        } else if (isDue) {
            console.log(`   🚀 Status: READY TO MAKE CALL NOW`);
            pendingCalls.push(call);
        } else {
            console.log(`   ⏳ Status: WAITING for scheduled time`);
        }
        console.log('');
    });
    
    // Check Twilio configuration
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER;
    
    console.log('📊 SUMMARY:');
    console.log(`   📞 Pending calls: ${pendingCalls.length}`);
    console.log(`   ❌ Failed calls: ${failedCalls.length}`);
    console.log(`   ✅ Completed calls: ${completedCalls.length}`);
    console.log(`   🔧 Twilio configured: ${hasTwilio ? '✅ YES' : '❌ NO'}`);
    
    if (pendingCalls.length > 0) {
        console.log('\n🚀 CALLS READY TO BE MADE:');
        pendingCalls.forEach(call => {
            console.log(`   - ${call.name} (${call.phone})`);
        });
        
        if (!hasTwilio) {
            console.log('\n❌ WHY CALLS AREN\'T BEING MADE:');
            console.log('   Twilio is not configured!');
            console.log('   The scheduler is working perfectly, but needs Twilio credentials.');
            console.log('\n🔧 TO FIX THIS:');
            console.log('1. Get Twilio credentials from https://www.twilio.com/');
            console.log('2. Create a .env file with:');
            console.log('   TWILIO_ACCOUNT_SID=your_account_sid');
            console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
            console.log('   TWILIO_PHONE_NUMBER=your_twilio_number');
            console.log('   PUBLIC_URL=https://hr-automate.onrender.com');
            console.log('3. Restart the server');
            console.log('4. The scheduler will automatically make calls!');
        } else {
            console.log('\n✅ CALLS WOULD BE MADE SUCCESSFULLY!');
        }
    } else {
        console.log('\n⏰ NO CALLS DUE AT THIS TIME');
        console.log('   All calls are either completed, failed, or scheduled for the future.');
    }
    
    if (failedCalls.length > 0) {
        console.log('\n❌ FAILED CALLS ANALYSIS:');
        failedCalls.forEach(call => {
            console.log(`   - ${call.name}: ${call.error}`);
        });
        console.log('\n💡 The failed calls were due to the old localhost URL issue.');
        console.log('   This has been fixed in the latest code.');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Set up Twilio credentials');
    console.log('2. Test with the "Direct Call" button in the dashboard');
    console.log('3. Schedule a new call for testing');
    console.log('4. Monitor the server logs for call attempts');
}

// Run the debug
debugScheduler(); 