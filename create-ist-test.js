const fs = require('fs');

// Load current calls
const callsData = JSON.parse(fs.readFileSync('calls.json', 'utf8'));

// Create a call scheduled for current IST time (add 1 minute to ensure it's in the future)
const now = new Date();
// Get IST offset (UTC+5:30 = 5.5 hours)
const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
const istTime = new Date(now.getTime() + istOffset);
const scheduledTime = new Date(istTime.getTime() + 1 * 60 * 1000); // Add 1 minute

const testCall = {
    id: 'test-ist-' + Date.now(),
    name: 'IST Test User - Fixed Timezone',
    phone: '+919876543210', // Replace with a real number for testing
    time: scheduledTime.toISOString(),
    completed: false,
    failed: false,
    created_at: new Date().toISOString()
};

callsData.calls.push(testCall);
fs.writeFileSync('calls.json', JSON.stringify(callsData, null, 2));

console.log('✅ Test call created for current IST time!');
console.log(`📞 Name: ${testCall.name}`);
console.log(`📱 Phone: ${testCall.phone}`);
console.log(`⏰ Scheduled (IST): ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`🆔 Call ID: ${testCall.id}`);
console.log('\n🎯 The scheduler will make this call in about 1 minute!');
console.log('   Make sure Twilio is configured in your .env file.'); 