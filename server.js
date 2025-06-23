const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const twilio = require('twilio');
const { VoiceResponse } = require('twilio').twiml;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const RENDER_BASE_URL = process.env.RENDER_BASE_URL || 'https://final-x03c.onrender.com';

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

// Load questions data
function loadQuestions() {
    try {
        const data = fs.readFileSync('questions.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading questions:', error);
        return { questions: [] };
    }
}

// Save questions data
function saveQuestions(questionsData) {
    try {
        fs.writeFileSync('questions.json', JSON.stringify(questionsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving questions:', error);
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

// Get all questions (public endpoint)
app.get('/api/questions', (req, res) => {
    try {
        const questionsData = loadQuestions();
        res.json({
            success: true,
            questions: questionsData.questions
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Add new question
app.post('/api/questions', authenticateToken, (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ success: false, message: 'Question is required' });
        }

        const questionsData = loadQuestions();
        const newQuestion = {
            id: (questionsData.questions.length > 0 ? Math.max(...questionsData.questions.map(q => q.id)) : 0) + 1,
            question
        };

        questionsData.questions.push(newQuestion);
        
        if (saveQuestions(questionsData)) {
            res.status(201).json({
                success: true,
                message: 'Question added successfully',
                question: newQuestion
            });
        } else {
            throw new Error('Failed to save question data.');
        }

    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update question
app.put('/api/questions/:id', authenticateToken, (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ success: false, message: 'Question text is required' });
        }

        const questionsData = loadQuestions();
        const questionIndex = questionsData.questions.findIndex(q => q.id === questionId);

        if (questionIndex === -1) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        // Update question data
        questionsData.questions[questionIndex].question = question;

        if (saveQuestions(questionsData)) {
            res.json({ 
                success: true, 
                message: 'Question updated successfully', 
                question: questionsData.questions[questionIndex] 
            });
        } else {
            throw new Error('Failed to save updated question data.');
        }

    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete question
app.delete('/api/questions/:id', authenticateToken, (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        const questionsData = loadQuestions();
        const initialQuestionCount = questionsData.questions.length;
        questionsData.questions = questionsData.questions.filter(q => q.id !== questionId);

        if (questionsData.questions.length === initialQuestionCount) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        if (saveQuestions(questionsData)) {
            res.json({ success: true, message: 'Question deleted successfully' });
        } else {
            throw new Error('Failed to save updated question data.');
        }

    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Reorder questions
app.post('/api/questions/reorder', authenticateToken, (req, res) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ success: false, message: 'An array of ordered IDs is required.' });
        }

        const questionsData = loadQuestions();
        const originalQuestions = questionsData.questions;
        
        const questionsMap = new Map(originalQuestions.map(q => [q.id.toString(), q]));
        
        const reorderedQuestions = orderedIds.map(id => questionsMap.get(id.toString())).filter(Boolean);

        if (reorderedQuestions.length !== originalQuestions.length) {
            return res.status(400).json({ success: false, message: 'Question ID mismatch during reordering.' });
        }
        
        questionsData.questions = reorderedQuestions;

        if (saveQuestions(questionsData)) {
            res.json({ success: true, message: 'Questions reordered successfully.' });
        } else {
            throw new Error('Failed to save reordered questions.');
        }

    } catch (error) {
        console.error('Reorder questions error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// --- Call Scheduling Utilities ---
function loadCalls() {
    try {
        const data = fs.readFileSync('calls.json', 'utf8');
        return data.trim() ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
}

function saveCalls(calls) {
    try {
        fs.writeFileSync('calls.json', JSON.stringify(calls, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving calls:', error);
        return false;
    }
}

// Schedule a call for the logged-in user
app.post('/api/schedule-call', authenticateToken, (req, res) => {
    const { name, phone, time } = req.body;
    if (!name || !phone || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    
    try {
        const usersData = loadUsers();
        const user = usersData.users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        const calls = loadCalls();
        const newCall = {
            id: calls.length > 0 ? Math.max(...calls.map(c => c.id)) + 1 : 1,
            userId: user.id,
            name,
            phone,
            scheduledTime: time, // Use 'scheduledTime' for compatibility with the rest of your app
            status: 'scheduled',
            created_at: new Date().toISOString()
        };
        
        calls.push(newCall);
        saveCalls(calls);

        // Log scheduled call info in IST
        const scheduledAtIST = new Date(time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        console.log(`Scheduled call: Name=${name}, Phone=${phone}, Scheduled Time=${scheduledAtIST} IST, UserId=${user.id}`);
        
        res.json({ 
            success: true, 
            message: 'Call scheduled successfully.', 
            call: newCall
        });
    } catch (error) {
        console.error('Error scheduling call:', error);
        res.status(500).json({ success: false, message: 'Failed to schedule call' });
    }
});

// Edit a scheduled call
app.put('/api/scheduled-calls/:id', authenticateToken, (req, res) => {
    const callId = parseInt(req.params.id, 10);
    const { name, phone, scheduledTime, status } = req.body;
    try {
        const calls = loadCalls();
        const callIndex = calls.findIndex(call => call.id === callId && call.userId === req.user.userId);
        if (callIndex === -1) {
            return res.status(404).json({ success: false, message: 'Call not found.' });
        }
        // Update fields if provided
        if (name) calls[callIndex].name = name;
        if (phone) calls[callIndex].phone = phone;
        if (scheduledTime) calls[callIndex].scheduledTime = scheduledTime;
        if (status) calls[callIndex].status = status;
        if (saveCalls(calls)) {
            res.json({ success: true, message: 'Call updated successfully.', call: calls[callIndex] });
        } else {
            throw new Error('Failed to update call.');
        }
    } catch (error) {
        console.error('Edit call error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get scheduled calls for the logged-in user
app.get('/api/scheduled-calls', authenticateToken, (req, res) => {
    try {
        const calls = loadCalls();
        const userCalls = calls.filter(call => call.userId === req.user.userId);
        res.json({ success: true, calls: userCalls });
    } catch (error) {
        console.error('Fetch scheduled calls error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete a scheduled call
app.delete('/api/scheduled-calls/:id', authenticateToken, (req, res) => {
    const callId = parseInt(req.params.id, 10);
    try {
        const calls = loadCalls();
        const callIndex = calls.findIndex(call => call.id === callId && call.userId === req.user.userId);
        if (callIndex === -1) {
            return res.status(404).json({ success: false, message: 'Call not found.' });
        }
        calls.splice(callIndex, 1);
        if (saveCalls(calls)) {
            res.json({ success: true, message: 'Call deleted successfully.' });
        } else {
            throw new Error('Failed to delete call.');
        }
    } catch (error) {
        console.error('Delete call error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Twilio status callback endpoint
app.post('/api/twilio-status-callback', express.urlencoded({ extended: false }), (req, res) => {
    const { CallSid, CallStatus } = req.body;
    if (!CallSid || !CallStatus) return res.sendStatus(400);

    const calls = loadCalls();
    const call = calls.find(c => c.twilioCallSid === CallSid);
    if (call) {
        if (CallStatus === 'completed') {
            call.status = 'completed';
        } else if ([ 'failed', 'busy', 'no-answer', 'canceled' ].includes(CallStatus)) {
            call.status = 'failed';
        }
        saveCalls(calls);
    }
    res.sendStatus(200);
});

// TwiML endpoint to ask questions from questions.json
app.post('/api/twilio-questions-voice', (req, res) => {
    const questionsData = loadQuestions();
    const questions = questionsData.questions || [];
    const questionIndex = parseInt(req.query.q || '0', 10);

    const twiml = new VoiceResponse();

    if (questionIndex < questions.length) {
        const gather = twiml.gather({
            input: 'speech',
            action: `/api/twilio-questions-voice?q=${questionIndex + 1}`,
            method: 'POST',
            timeout: 5
        });
        gather.say(questions[questionIndex].question);
        twiml.say('We did not receive your answer.');
        twiml.redirect(`/api/twilio-questions-voice?q=${questionIndex + 1}`);
    } else {
        twiml.say('Thank you for answering the questions. Goodbye!');
        twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// --- Twilio Call Scheduler ---
cron.schedule('* * * * *', async () => {
    const calls = loadCalls();
    let updated = false;
    const now = new Date();
    for (const call of calls) {
        if (
            call.status === 'scheduled' &&
            call.scheduledTime &&
            new Date(call.scheduledTime) <= now &&
            call.phone &&
            !call.twilioCallSid // Only call if not already called
        ) {
            try {
                // Place the call using Twilio
                const twilioCall = await twilioClient.calls.create({
                    url: `${RENDER_BASE_URL}/api/twilio-questions-voice`,
                    to: call.phone,
                    from: TWILIO_PHONE_NUMBER,
                    statusCallback: `${RENDER_BASE_URL}/api/twilio-status-callback`,
                    statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer', 'canceled']
                });
                // Mark as in-progress until callback
                call.status = 'in-progress';
                call.twilioCallSid = twilioCall.sid;
                updated = true;
                const initiatedAtIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                console.log(`Twilio call placed to ${call.phone} (Call SID: ${twilioCall.sid}) at ${initiatedAtIST} IST (scheduled for: ${call.scheduledTime})`);
            } catch (err) {
                console.error('Twilio call error:', err);
                call.status = 'failed';
                call.error = err.message;
                updated = true;
            }
        }
    }
    if (updated) {
        saveCalls(calls);
    }
});

// Test Call Endpoint
app.post('/api/test-call', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });
    try {
        const twilioCall = await twilioClient.calls.create({
            url: `${RENDER_BASE_URL}/api/twilio-questions-voice`,
            to: phone,
            from: TWILIO_PHONE_NUMBER,
            statusCallback: `${RENDER_BASE_URL}/api/twilio-status-callback`,
            statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer', 'canceled']
        });
        res.json({ success: true, message: 'Test call initiated.', callSid: twilioCall.sid });
    } catch (err) {
        console.error('Test call error:', err);
        res.status(500).json({ success: false, message: 'Failed to initiate test call.' });
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