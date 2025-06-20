# Setup Guide for Call System

## Issues Found and Fixed

The main issues preventing questions from being asked and calls from working properly were:

1. **Incorrect Twilio webhook URL** - Fixed to use local server instead of external URL
2. **Missing Twilio credentials** - Added proper initialization with error handling
3. **TwiML logic issues** - Improved question handling and response collection
4. **Missing error handling** - Added better error management and logging
5. **Missing responses file** - Added proper response storage

## Required Setup

### 1. Twilio Account Setup

You need a Twilio account with:
- Account SID
- Auth Token  
- Phone Number

### 2. Environment Variables

Create a `.env` file in the root directory with:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
node server.js
```

## How the Call System Works

1. **Schedule a Call**: User schedules a call through the dashboard
2. **Background Scheduler**: Server checks every minute for calls due
3. **Twilio Call**: When a call is due, Twilio makes the call
4. **TwiML Webhook**: Your server receives the call and asks questions
5. **Response Collection**: User responses are collected and stored
6. **Call Completion**: Call ends after all questions are asked

## Testing the System

### 1. Test TwiML Generation

Visit `http://localhost:3000/test-twiml.html` to test the TwiML generation without needing Twilio.

### 2. Test Manual Call Trigger

1. Schedule a call through the dashboard
2. Go to "Scheduled Calls" 
3. Click "Trigger Now" button to manually trigger the call

### 3. Check Console Logs

The server now provides detailed logging:
- Twilio client initialization status
- Call scheduling attempts
- TwiML request details
- Response storage

## Files Modified

- `server.js`: Fixed Twilio integration and TwiML logic
- `user-dashboard.js`: Added manual call trigger functionality
- `test-twiml.html`: Added testing interface
- Added better error handling and logging
- Improved question progression logic

## Current Questions

The system currently has these questions configured:
- "what is your name?"
- "what is your age?"

You can modify these in the "Manage Questions" section of the dashboard.

## Testing Without Twilio

If you don't have Twilio credentials, the system will:
- Show a warning message in console
- Skip the call scheduler
- Still allow you to schedule calls (they just won't be made)
- Allow you to test TwiML generation

## Next Steps

1. Get Twilio credentials from https://www.twilio.com/
2. Set up environment variables in `.env` file
3. Test with a real phone number
4. Check the console logs for debugging information
5. Use the test page to verify TwiML generation

## Troubleshooting

### Call not being made:
- Check if Twilio credentials are set correctly
- Verify the phone number format (should include country code)
- Check console logs for error messages

### Questions not being asked:
- Verify questions are configured in the dashboard
- Check the TwiML test page to ensure proper generation
- Review server logs for TwiML request details

### Responses not being saved:
- Check if `responses.json` file is being created
- Verify the TwiML webhook is receiving requests
- Review the response storage logic in server logs 