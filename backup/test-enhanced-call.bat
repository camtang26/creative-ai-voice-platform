@echo off
echo ========================================================
echo    TEST CALL USING ENHANCED SERVER
echo ========================================================
echo.

set SERVER_URL=

FOR /F "tokens=*" %%a in (ngrok_url.txt) do SET SERVER_URL=%%a
echo Using ngrok URL: %SERVER_URL%
echo.

if "%1"=="" (
  echo Please provide a phone number: test-enhanced-call.bat +1234567890
  exit /b
)

echo Making call to: %1
echo Using ngrok server: %SERVER_URL%
echo.

node test-call.js %1 "You are a helpful assistant making a phone call." "Hello, this is Investor Signals AI assistant in training. May I please speak with you?" %SERVER_URL%

echo.
echo Call completed.
