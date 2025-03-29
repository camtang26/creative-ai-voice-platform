@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo    INVESTOR SIGNALS FIXED SERVER
echo    Improved Twilio Integration (v2.1.1)
echo ========================================================
echo This version includes:
echo  - Enhanced data collection from Twilio
echo  - Robust call recording management
echo  - Automatic call termination
echo  - Call inactivity detection
echo  - Answering machine detection
echo  - Fixed route conflict issues
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
start /min .\ngrok.exe http 8000

:: Wait for ngrok to initialize
echo Waiting for ngrok to initialize...
timeout /t 3 /nobreak >nul

:: Get the ngrok URL using proper JSON parsing
echo Retrieving ngrok URL...
for /f "tokens=* usebackq" %%g in (`curl -s http://localhost:4040/api/tunnels`) do (
    set json=%%g
)

:: Extract the public URL more reliably
echo Parsing public URL...
set "ngrok_url="
for /f "tokens=2 delims=:," %%a in ('echo !json! ^| findstr "public_url"') do (
    set "url_part=%%a"
    :: Remove quotes and spaces
    set "url_part=!url_part:"=!"
    set "url_part=!url_part: =!"
    set "ngrok_url=https:!url_part!"
)

:: Check if we got a valid URL
if "!ngrok_url!"=="" (
    echo Failed to get ngrok URL, using default localhost URL
    set "ngrok_url=http://localhost:8000"
)

:: Save the ngrok URL to a file for later use
echo !ngrok_url! > ngrok_url.txt
echo Ngrok URL: !ngrok_url!

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
echo Starting enhanced server with environment...
echo SERVER_URL=!ngrok_url!
echo ========================================================
echo    FIXED SERVER STARTING - PRESS CTRL+C TO STOP
echo ========================================================

node enhanced-server.js

endlocal
