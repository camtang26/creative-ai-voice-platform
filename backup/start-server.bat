@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo    INVESTOR SIGNALS SERVER
echo    Unified Twilio Integration (v2.1.1)
echo ========================================================
echo This version is a wrapper to the enhanced implementation
echo and includes all enhanced features:
echo  - Enhanced data collection from Twilio
echo  - Robust call recording management
echo  - Automatic call termination
echo  - Call inactivity detection
echo  - Answering machine detection
echo ========================================================

:: Check if port 8000 is in use and close it if needed
echo Checking for processes using port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Found process: %%a using port 8000
    taskkill /F /PID %%a
    echo Process terminated
)

:: Stop any existing ngrok instances
echo Stopping any running ngrok processes...
taskkill /F /IM ngrok.exe 2>nul
timeout /t 1 /nobreak >nul

:: Start ngrok in the background
echo Starting ngrok...
start /min ngrok http 8000

:: Wait for ngrok to initialize
echo Waiting for ngrok to initialize...
timeout /t 3 /nobreak >nul

:: Get the ngrok URL - improved parsing to handle JSON response
echo Retrieving ngrok URL...
for /f "tokens=2,* delims=:" %%a in ('curl -s http://localhost:4040/api/tunnels ^| findstr /c:"public_url"') do (
    set "ngrok_url=%%a"
    set "ngrok_url=!ngrok_url:~2,-2!"
    echo Found ngrok URL: !ngrok_url!
)

:: If URL not found or malformed, try alternative approach
if "!ngrok_url!"=="" (
    echo Trying alternative ngrok URL retrieval...
    set "ngrok_url="
    for /f "tokens=*" %%a in ('curl -s http://localhost:4040/api/tunnels ^| findstr /c:"public_url"') do (
        set "line=%%a"
        set "line=!line:*public_url\":\"=!"
        set "line=!line:\".*=!"
        set "ngrok_url=!line:~0,-2!"
    )
    echo Alternative method found URL: !ngrok_url!
)

:: Save the ngrok URL to a file for later use
echo !ngrok_url! > ngrok_url.txt
echo Saved URL to ngrok_url.txt

:: Update .env with the ngrok URL
echo Updating .env with ngrok URL...
set "found="
if exist .env (
    for /f "tokens=1* delims==" %%a in (.env) do (
        if "%%a"=="SERVER_URL" (
            echo SERVER_URL=!ngrok_url!>> .env.new
            set "found=1"
        ) else (
            echo %%a=%%b>> .env.new
        )
    )
    if not defined found (
        echo SERVER_URL=!ngrok_url!>> .env.new
    )
    move /y .env.new .env > nul
) else (
    echo SERVER_URL=!ngrok_url!> .env
)

:: Start the server
echo Starting unified server with environment...
echo SERVER_URL=!ngrok_url!
echo ========================================================
echo    UNIFIED SERVER STARTING - PRESS CTRL+C TO STOP
echo ========================================================

:: Run with Node.js ESM mode explicitly
node --experimental-modules server.js

endlocal