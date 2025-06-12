# CSV Upload Feature Guide

## Overview
The CSV upload feature is now fully implemented and ready to use. It includes phone number validation and configurable call intervals.

## Features
- **CSV File Upload**: Upload CSV files with contact information
- **Phone Number Validation**: Optional validation to filter out invalid phone numbers
- **Configurable Call Intervals**: Set delays between calls (60-300 seconds)
- **Invalid Number Reporting**: See which numbers were filtered out and why
- **Campaign Creation**: Automatically creates and manages campaigns in MongoDB

## CSV File Format
Your CSV file should have the following columns:
- `ID` (optional)
- `FirstName` 
- `LastName`
- `Email` (optional)
- `Phone` (required)

Alternative column names are also supported:
- `Phone Number`, `Mobile` for phone
- `First Name`, `first name` for first name
- `Last Name`, `last name` for last name

## How to Use

1. **Start the Backend Server**:
   ```bash
   node server-mongodb.js
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Make Call Page**:
   - Go to http://localhost:3001/make-call
   - Click on the "Upload CSV" tab

4. **Configure Your Campaign**:
   - Enter a campaign name
   - Set your agent prompt
   - Set your first message (use {name} as a placeholder)
   - Choose your CSV file
   - Set the call interval (default: 90 seconds)
   - Enable/disable phone validation

5. **Upload and Start**:
   - Click "Start Campaign from Sheet"
   - The system will process your CSV and start calling

## Testing
A test CSV file (`test-contacts.csv`) has been created with:
- 5 valid US phone numbers
- 2 invalid numbers (to test validation)

## Phone Number Validation
When enabled, the system validates phone numbers using the libphonenumber library:
- Checks if numbers are valid format
- Formats numbers to E.164 standard
- Reports invalid numbers with reasons

## Call Intervals
- Minimum: 60 seconds
- Maximum: 300 seconds 
- Default: 90 seconds
- Recommended: 60-120 seconds

## Monitoring Progress
- Campaign progress is logged in the server console
- Invalid numbers are reported in the UI
- Call status is tracked in MongoDB

## Your 200-Lead CSV File
Your CSV file located at:
```
C:\Users\wowca\Cursor Projects\Twilio Node.js server\elevenlabs-outbound-calling\csv file\CSV file for 200 leads to be called - Trials, Never Active, since before 2020 - Sheet2.csv
```

This file is ready to use with the system. The columns match the expected format:
- ID
- FirstName
- LastName
- Email
- Phone

## Important Notes
- Ensure your Twilio account has sufficient credits
- The system processes calls sequentially with the configured interval
- Invalid numbers are filtered out before calling begins
- All campaign data is stored in MongoDB for tracking