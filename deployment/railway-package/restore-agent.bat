@echo off
echo ====================================================
echo     RESTORE FULL AGENT FUNCTIONALITY
echo ====================================================
echo This script will restore full agent functionality
echo while keeping the Twilio AU region benefit.
echo.

REM Create the restore file
echo Creating updated outbound file...

REM Replace with an updated version that has all agent functionality
copy outbound-minimal.js outbound-minimal.js.bak

REM Download the updated file
curl -s -o outbound-full.js https://raw.githubusercontent.com/cameronp98/elevenlabs-outbound-calling/main/outbound.js 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Failed to download from GitHub, using local restoration
    copy outbound-minimal.js outbound-full.js
    echo This file was about to be edited by a script > outbound-edit.txt
    echo but the download failed. Please follow instructions instead. >> outbound-edit.txt
    echo. >> outbound-edit.txt
    notepad outbound-edit.txt
    exit /b 1
)

REM Inject AU region code into the full file
powershell -Command "(Get-Content outbound-full.js) -replace 'const twilioClient = new Twilio\(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN\);', 'const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {region: ''au1''});`n  console.log(\"[Twilio] Initialized with Australia region (au1) for lower latency\");' | Set-Content outbound-full.js"

REM Inject region in call creation
powershell -Command "(Get-Content outbound-full.js) -replace 'from: TWILIO_PHONE_NUMBER,`n        to: number,`n        url: urlWithFirstMessage', 'from: callerId || TWILIO_PHONE_NUMBER,`n        to: number,`n        url: urlWithFirstMessage,`n        region: ''au1'' // Use Australia region' | Set-Content outbound-full.js"

REM Add callerId parameter extraction
powershell -Command "(Get-Content outbound-full.js) -replace 'const { number, prompt, first_message } = request.body;', 'const { number, prompt, first_message, callerId } = request.body;' | Set-Content outbound-full.js"

echo Copying file to outbound.js
copy outbound-full.js outbound.js

echo.
echo Next steps:
echo 1. Deploy to Railway with the updated outbound.js:
echo    railway up
echo.
echo 2. After deployment, check if the agent functionality is working correctly
echo    by making a test call.
echo.
echo 3. If you want to revert to minimal version:
echo    copy outbound-minimal.js outbound.js
echo    railway up
echo.
echo ====================================================
echo.
pause