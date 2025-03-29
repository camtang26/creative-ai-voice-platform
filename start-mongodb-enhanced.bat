@echo off
setlocal enabledelayedexpansion

echo ElevenLabs/Twilio MongoDB Enhanced Server
echo =========================================
echo.

:: Check if ngrok is already running
tasklist /FI "IMAGENAME eq ngrok.exe" 2>NUL | find /I /N "ngrok.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Ngrok is already running.
) else (
    echo Starting ngrok...
    start "Ngrok Tunnel" /MIN ngrok http 8000
    
    :: Wait for ngrok to start
    echo Waiting for ngrok to start...
    timeout /t 5 /nobreak > nul
)

:: Check if MongoDB is installed
if not exist node_modules\mongoose (
    echo MongoDB dependencies not found. Installing...
    call npm run install-mongodb
)

:: Get the ngrok URL using PowerShell for better JSON parsing
echo Retrieving ngrok URL...
for /f "delims=" %%a in ('powershell -Command "(Invoke-WebRequest -Uri http://localhost:4040/api/tunnels | ConvertFrom-Json).tunnels[0].public_url"') do (
    set "ngrok_url=%%a"
    echo Found ngrok URL: !ngrok_url!
)

:: If URL not found or malformed, try alternative approach
if "!ngrok_url!"=="" (
    echo Trying alternative ngrok URL retrieval...
    for /f "tokens=2 delims=:," %%a in ('curl -s http://localhost:4040/api/tunnels ^| findstr "public_url"') do (
        set "ngrok_url=%%a"
        set "ngrok_url=!ngrok_url:~2,-1!"
        echo Alternative method found URL: !ngrok_url!
    )
)

:: Save ngrok URL to file for reference
echo !ngrok_url! > ngrok_url.txt

:: Update .env file with ngrok URL
echo Updating .env file with ngrok URL...
powershell -Command "(Get-Content .env) -replace '^SERVER_URL=.*', 'SERVER_URL=!ngrok_url!' | Set-Content .env"

:: Start the server
echo Starting MongoDB-enhanced server...
echo Server URL: !ngrok_url!
echo.
echo Press Ctrl+C to stop the server.
echo.

:: Start the server with MongoDB integration
node server-mongodb.js

:: Cleanup on exit
echo Stopping ngrok...
taskkill /F /IM ngrok.exe 2>NUL

echo Server stopped.
endlocal