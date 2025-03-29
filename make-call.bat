@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo    TEST CALL USING ENHANCED SERVER
echo ========================================================
echo.

:: Use the Node.js helper to retrieve the ngrok URL reliably
for /f "tokens=*" %%a in ('node get-ngrok-url.js') do (
    set "SERVER_URL=%%a"
)

echo Using server: !SERVER_URL!
echo.

if "%1"=="" (
    echo Please provide a phone number: make-call.bat +1234567890
    exit /b
)

echo Making call to: %1
echo.

:: Run the test call with proper arguments
node test-call.js %1 "You are a helpful assistant making a phone call." "Hello, this is Investor Signals AI assistant in training. May I please speak with you?" !SERVER_URL!

echo.
echo Call completed.
endlocal
