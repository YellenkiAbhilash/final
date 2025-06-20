// Test IST timezone calculations
const now = new Date();
const istTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
const istTime = new Date(istTimeString);

console.log('🧪 TESTING IST TIMEZONE CALCULATIONS');
console.log(`Current UTC: ${now.toISOString()}`);
console.log(`Current IST: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`IST Time Object: ${istTime}`);

// Test with a specific time (5:40 PM IST today)
const testTime = new Date();
testTime.setHours(17, 40, 0, 0); // 5:40 PM
const testTimeISTString = testTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
const testTimeIST = new Date(testTimeISTString);

console.log(`\nTest Time (5:40 PM): ${testTime.toISOString()}`);
console.log(`Test Time IST: ${testTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

const timeDiff = testTimeIST - istTime;
const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));

console.log(`\nTime difference: ${minutesUntilCall} minutes`);
console.log(`Is due: ${testTimeIST <= istTime ? 'YES' : 'NO'}`); 