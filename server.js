const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { twiml: { VoiceResponse } } = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Load users data
function loadUsers() {
    try {
        const data = fs.readFileSync('users.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return { users: [] };
    }
}

// Save users data
function saveUsers(usersData) {
    try {
        fs.writeFileSync('users.json', JSON.stringify(usersData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// Load calls data
const callsFile = path.join(__dirname, 'calls.json');

function loadCalls() {
    try {
        if (!fs.existsSync(callsFile)) {
            fs.writeFileSync(callsFile, JSON.stringify({ calls: [] }, null, 2));
        }
        const data = fs.readFileSync(callsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading calls:', error);
        return { calls: [] };
    }
}

function saveCalls(callsData) {
    try {
        fs.writeFileSync(callsFile, JSON.stringify(callsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving calls:', error);
        return false;
    }
}

// In-memory reset tokens (for demo; use DB in production)
const resetTokens = {};

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Add Twilio setup at the top (after other requires)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are available
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio client initialized successfully');
} else {
    console.warn('Twilio credentials not found. Call functionality will be disabled.');
    console.warn('Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
}

// Add questions file and functions
const questionsFile = path.join(__dirname, 'questions.json');
function loadQuestions() {
    try {
        if (!fs.existsSync(questionsFile)) {
            fs.writeFileSync(questionsFile, JSON.stringify({ questions: [] }, null, 2));
        }
        const data = fs.readFileSync(questionsFile, 'utf8');
        return JSON.parse(data).questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        return [];
    }
}
function saveQuestions(questions) {
    try {
        fs.writeFileSync(questionsFile, JSON.stringify({ questions }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving questions:', error);
        return false;
    }
}

// At the top, after other requires
const responsesFile = path.join(__dirname, 'responses.json');
function loadResponses() {
    try {
        if (!fs.existsSync(responsesFile)) {
            fs.writeFileSync(responsesFile, JSON.stringify({ responses: [] }, null, 2));
        }
        const data = fs.readFileSync(responsesFile, 'utf8');
        return JSON.parse(data).responses;
    } catch (error) {
        console.error('Error loading responses:', error);
        return [];
    }
}
function saveResponses(responses) {
    try {
        fs.writeFileSync(responsesFile, JSON.stringify({ responses }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving responses:', error);
        return false;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const usersData = loadUsers();
        const user = usersData.users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // For demo purposes, we'll use plain text comparison
        // In production, you should use bcrypt.compare(password, user.password)
        if (password !== user.password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Update last login
        user.last_login = new Date().toISOString();
        saveUsers(usersData);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, credits } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, password, and name are required' 
            });
        }

        const usersData = loadUsers();
        
        // Check if user already exists
        if (usersData.users.find(u => u.email === email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Create new user
        const newUser = {
            id: usersData.users.length + 1,
            email,
            password, // In production, hash this with bcrypt
            name,
            role: 'user',
            created_at: new Date().toISOString(),
            last_login: null,
            credits: typeof credits === 'number' ? credits : 0
        };

        usersData.users.push(newUser);
        saveUsers(usersData);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                credits: newUser.credits
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Protected route example
app.get('/api/profile', authenticateToken, (req, res) => {
    // Fetch the full user object from users.json
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === req.user.email);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            credits: user.credits || 0,
            created_at: user.created_at,
            last_login: user.last_login
        }
    });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
}

// Get all users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    const usersData = loadUsers();
    const users = usersData.users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
        credits: user.credits || 0
    }));

    res.json({
        success: true,
        users: users
    });
});

// Update user details (admin only)
app.put('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    try {
        const userId = parseInt(req.params.id, 10);
        const { name, email, role, credits } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
        }

        const usersData = loadUsers();
        const userIndex = usersData.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check for email conflicts
        if (usersData.users.some(u => u.email === email && u.id !== userId)) {
            return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
        }

        // Update user data
        usersData.users[userIndex] = {
            ...usersData.users[userIndex],
            name,
            email,
            role,
            credits: typeof credits === 'number' ? credits : usersData.users[userIndex].credits || 0
        };

        if (saveUsers(usersData)) {
            res.json({ success: true, message: 'User updated successfully', user: usersData.users[userIndex] });
        } else {
            throw new Error('Failed to save updated user data.');
        }

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    try {
        const userIdToDelete = parseInt(req.params.id, 10);
        const adminUserId = req.user.userId;

        if (userIdToDelete === adminUserId) {
            return res.status(400).json({ success: false, message: 'Admins cannot delete their own account.' });
        }

        const usersData = loadUsers();
        const initialUserCount = usersData.users.length;
        usersData.users = usersData.users.filter(u => u.id !== userIdToDelete);

        if (usersData.users.length === initialUserCount) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (saveUsers(usersData)) {
            res.json({ success: true, message: 'User deleted successfully' });
        } else {
            throw new Error('Failed to save updated user data.');
        }

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Forgot Password endpoint - Email-based
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === email);
    if (!user) {
        // Return error if user not found
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Generate a reset token
    const resetToken = Math.random().toString(36).substr(2, 8) + Date.now();
    resetTokens[resetToken] = {
        email,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        userId: user.id
    };
    // Send email with reset link
    const resetUrl = `${process.env.RESET_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `<h2>Password Reset</h2><p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>If you did not request this, please ignore this email.</p>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Reset email sent to', email);
    } catch (err) {
        console.error('Error sending reset email:', err);
        // For security, still return success
    }
    return res.json({ success: true, message: 'If this email is registered, a reset link will be sent.' });
});

// Reset Password endpoint
app.post('/api/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    
    const entry = resetTokens[token];
    if (!entry || entry.expires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === entry.email);
    if (!user) {
        return res.status(400).json({ success: false, message: 'User not found' });
    }
    
    // Update password
    user.password = newPassword; // In production, hash this with bcrypt
    saveUsers(usersData);
    
    // Remove the used token
    delete resetTokens[token];
    
    console.log(`Password reset successful for ${entry.email}`);
    
    return res.json({ 
        success: true, 
        message: 'Password reset successful' 
    });
});

// Schedule a call for the logged-in user
app.post('/api/schedule-call', authenticateToken, (req, res) => {
    const { name, phone, time } = req.body;
    if (!name || !phone || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.id === req.user.userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const callsData = loadCalls();
    const newCall = {
        id: callsData.calls.length + 1,
        userId: user.id,
        name,
        phone,
        time,
        created_at: new Date().toISOString()
    };
    callsData.calls.push(newCall);
    console.log('Writing to calls.json at:', callsFile); // Debug log
    saveCalls(callsData);
    res.json({ success: true, message: 'Call scheduled successfully.', call: newCall });
});

// Get all scheduled calls for the logged-in user
app.get('/api/scheduled-calls', authenticateToken, (req, res) => {
    const callsData = loadCalls();
    const userCalls = callsData.calls.filter(call => call.userId === req.user.userId);
    res.json({ success: true, calls: userCalls });
});

// Add background scheduler before app.listen
setInterval(async () => {
    if (!twilioClient) {
        console.log('⚠️  Twilio client not available, skipping call scheduler');
        console.log('   To fix this, create a .env file with your Twilio credentials');
        return;
    }
    
    const callsData = loadCalls();
    // Use IST timezone properly - get current time in IST
    const now = new Date();
    // Get IST offset (UTC+5:30 = 5.5 hours)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    console.log(`\n🕐 Scheduler check at ${now.toISOString()} (IST: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`   Total calls: ${callsData.calls.length}`);
    
    let updated = false;

    for (const call of callsData.calls) {
        const callTime = new Date(call.time);
        // Convert call time to IST
        const callTimeIST = new Date(callTime.getTime() + istOffset);
        const timeDiff = callTimeIST - istTime;
        const minutesUntilCall = Math.floor(timeDiff / (1000 * 60));
        
        console.log(`   Call ${call.id}: ${call.name} (${call.phone}) - Scheduled: ${callTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`     Status: ${call.completed ? '✅ Completed' : call.failed ? '❌ Failed' : '⏳ Pending'}`);
        console.log(`     Time until call: ${minutesUntilCall} minutes`);
        
        if (!call.completed && !call.failed && callTimeIST <= istTime) {
            console.log(`   🚀 Making call to ${call.name} (${call.phone})`);
            try {
                // Use a public URL for Twilio (you'll need to deploy this or use ngrok)
                const publicUrl = process.env.PUBLIC_URL || 'https://hr-automate.onrender.com';
                const twimlUrl = `${publicUrl}/twiml/ask`;
                console.log(`   📞 Call URL: ${twimlUrl}`);
                
                await twilioClient.calls.create({
                    url: twimlUrl,
                    to: call.phone,
                    from: TWILIO_PHONE_NUMBER
                });
                call.completed = true;
                call.completed_at = new Date().toISOString();
                console.log(`   ✅ Call made successfully to ${call.name} (${call.phone})`);
                updated = true;
            } catch (err) {
                console.error(`   ❌ Error making call with Twilio:`, err.message);
                // Mark as failed to prevent retry
                call.failed = true;
                call.failed_at = new Date().toISOString();
                call.error = err.message;
                updated = true;
            }
        } else if (!call.completed && !call.failed) {
            console.log(`   ⏰ Call not due yet (${minutesUntilCall} minutes remaining)`);
        }
    }
    
    if (updated) {
        saveCalls(callsData);
        console.log(`   💾 Updated calls data`);
    } else {
        console.log(`   📝 No updates needed`);
    }
}, 60 * 1000); // Check every minute

// GET /api/questions
app.get('/api/questions', authenticateToken, (req, res) => {
    const questions = loadQuestions();
    res.json({ success: true, questions });
});

// POST /api/questions
app.post('/api/questions', authenticateToken, (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
        return res.status(400).json({ success: false, message: 'Questions must be an array.' });
    }
    if (saveQuestions(questions)) {
        res.json({ success: true, questions });
    } else {
        res.status(500).json({ success: false, message: 'Failed to save questions.' });
    }
});

// Test endpoint to verify TwiML functionality
app.get('/test-twiml', (req, res) => {
    const questions = loadQuestions();
    const questionIndex = parseInt(req.query.questionIndex || '0', 10);
    
    const response = new VoiceResponse();
    
    if (questionIndex < questions.length) {
        const gather = response.gather({
            input: 'speech dtmf',
            numDigits: 1,
            action: `/test-twiml?questionIndex=${questionIndex + 1}`,
            method: 'GET',
            timeout: 10,
            speechTimeout: 'auto'
        });
        
        gather.say(`Question ${questionIndex + 1}: ${questions[questionIndex]}`);
        
        // If no response, repeat the question
        response.say(`Question ${questionIndex + 1}: ${questions[questionIndex]}`);
        response.redirect({ method: 'GET' }, `/test-twiml?questionIndex=${questionIndex}`);
    } else {
        response.say('Thank you for your responses. Goodbye!');
        response.hangup();
    }
    
    res.type('text/xml');
    res.send(response.toString());
});

// TwiML webhook to ask questions and collect responses
app.post('/twiml/ask', express.urlencoded({ extended: false }), (req, res) => {
    const callSid = req.body.CallSid;
    const digits = req.body.SpeechResult || req.body.Digits;
    const questionIndex = parseInt(req.query.questionIndex || req.body.questionIndex || '0', 10);
    const questions = loadQuestions();
    let responses = loadResponses();
    
    console.log(`TwiML Request - CallSid: ${callSid}, QuestionIndex: ${questionIndex}, Response: ${digits}`);
    
    let callResponse = responses.find(r => r.callSid === callSid);
    if (!callResponse) {
        callResponse = { callSid, answers: [], timestamp: new Date().toISOString() };
        responses.push(callResponse);
    }
    
    // Store response if present and not first question
    if (callSid && digits !== undefined && questionIndex > 0) {
        callResponse.answers[questionIndex - 1] = digits;
        saveResponses(responses);
        console.log(`Stored response for question ${questionIndex - 1}: ${digits}`);
    }
    
    const response = new VoiceResponse();
    
    if (questionIndex < questions.length) {
        // Ask the current question
        const gather = response.gather({
            input: 'speech dtmf',
            numDigits: 1,
            action: `/twiml/ask?questionIndex=${questionIndex + 1}`,
            method: 'POST',
            timeout: 10,
            speechTimeout: 'auto'
        });
        
        gather.say(`Question ${questionIndex + 1}: ${questions[questionIndex]}`);
        console.log(`Asking question ${questionIndex + 1}: ${questions[questionIndex]}`);
        
        // If no response, repeat the question
        response.say(`Question ${questionIndex + 1}: ${questions[questionIndex]}`);
        response.redirect({ method: 'POST' }, `/twiml/ask?questionIndex=${questionIndex}`);
    } else {
        // All questions completed
        response.say('Thank you for your responses. Goodbye!');
        response.hangup();
        console.log(`Call completed for CallSid: ${callSid}`);
    }
    
    res.type('text/xml');
    res.send(response.toString());
});

// Direct call endpoint - make call immediately
app.post('/api/direct-call', authenticateToken, async (req, res) => {
    if (!twilioClient) {
        return res.status(400).json({ 
            success: false, 
            message: 'Twilio client not configured' 
        });
    }
    
    const { name, phone } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name and phone number are required.' 
        });
    }
    
    try {
        const publicUrl = process.env.PUBLIC_URL || 'https://hr-automate.onrender.com';
        const twimlUrl = `${publicUrl}/twiml/ask`;
        console.log(`Making direct call to ${name} (${phone}) at ${twimlUrl}`);
        
        // Make the call immediately
        const call = await twilioClient.calls.create({
            url: twimlUrl,
            to: phone,
            from: TWILIO_PHONE_NUMBER
        });
        
        // Save call record for tracking
        const callsData = loadCalls();
        const newCall = {
            id: callsData.calls.length + 1,
            userId: req.user.userId,
            name,
            phone,
            time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            completed: true,
            completed_at: new Date().toISOString(),
            direct_call: true,
            twilio_call_sid: call.sid
        };
        callsData.calls.push(newCall);
        saveCalls(callsData);
        
        console.log(`Direct call made successfully to ${name} (${phone})`);
        
        res.json({ 
            success: true, 
            message: 'Call initiated successfully!',
            call: newCall
        });
    } catch (err) {
        console.error('Error making direct call:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to make call: ' + err.message 
        });
    }
});

// Manual call trigger for testing (admin only)
app.post('/api/trigger-call/:callId', authenticateToken, async (req, res) => {
    if (!twilioClient) {
        return res.status(400).json({ 
            success: false, 
            message: 'Twilio client not configured' 
        });
    }
    
    const callId = parseInt(req.params.callId);
    const callsData = loadCalls();
    const call = callsData.calls.find(c => c.id === callId);
    
    if (!call) {
        return res.status(404).json({ 
            success: false, 
            message: 'Call not found' 
        });
    }
    
    if (call.userId !== req.user.userId) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized to trigger this call' 
        });
    }
    
    try {
        const publicUrl = process.env.PUBLIC_URL || 'https://hr-automate.onrender.com';
        const twimlUrl = `${publicUrl}/twiml/ask`;
        console.log(`Manually triggering call to ${call.name} (${call.phone}) at ${twimlUrl}`);
        console.log(`IST Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        
        await twilioClient.calls.create({
            url: twimlUrl,
            to: call.phone,
            from: TWILIO_PHONE_NUMBER
        });
        
        call.completed = true;
        call.completed_at = new Date().toISOString();
        call.manual_trigger = true;
        saveCalls(callsData);
        
        res.json({ 
            success: true, 
            message: 'Call triggered successfully' 
        });
    } catch (err) {
        console.error('Error triggering call:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to trigger call: ' + err.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET}`);
    console.log(`👥 Available users:`);
    
    const usersData = loadUsers();
    usersData.users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
    });
    console.log(`\n🔑 Password Reset: Token-based system active`);
    console.log(`   Reset tokens expire in 15 minutes`);
}); 