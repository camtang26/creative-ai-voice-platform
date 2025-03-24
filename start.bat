@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Investor Signals Server

:: Display banner
echo.
echo ========================================================
echo    INVESTOR SIGNALS SERVER
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in your PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Kill any processes using port 8000
echo Checking for processes using port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Found process using port 8000: %%a
    echo Terminating process...
    taskkill /F /PID %%a >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo Process terminated successfully.
    ) else (
        echo Failed to terminate process. You may need to run this script as administrator.
    )
)

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "ngrok.exe" (
        echo Found ngrok.exe in the current directory
    ) else (
        echo ERROR: ngrok is not installed or not in your PATH
        echo Please install ngrok from https://ngrok.com/download
        pause
        exit /b 1
    )
)

:: Kill any running ngrok processes
echo Stopping any running ngrok processes...
taskkill /f /im ngrok.exe >nul 2>nul

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Start ngrok in a new window
echo Starting ngrok...
start "Ngrok Tunnel" cmd /c "ngrok http 8000 --log=stdout > logs\ngrok.log"

:: Wait for ngrok to initialize
echo Waiting for ngrok to initialize...
timeout /t 5 /nobreak >nul

:: Create a temporary file for the JSON output
set TEMP_JSON_FILE=ngrok_tunnels_temp.json
curl -s http://localhost:4040/api/tunnels > %TEMP_JSON_FILE%

:: Use PowerShell to properly extract the URL
echo Retrieving ngrok URL...
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content -Raw %TEMP_JSON_FILE% | ConvertFrom-Json).tunnels | Where-Object {$_.proto -eq 'https'} | Select-Object -ExpandProperty public_url"') do (
    set ngrokurl=%%a
)

:: Delete temporary file
del %TEMP_JSON_FILE%

:: Check if we got a valid URL
if "!ngrokurl!" == "" (
    echo Failed to get ngrok URL. Using default http://localhost:8000
    set SERVER_URL=http://localhost:8000
) else (
    echo Ngrok URL: !ngrokurl!
    set SERVER_URL=!ngrokurl!
    
    :: Update the .env file with the ngrok URL
    echo Updating .env with ngrok URL...
    powershell -Command "(Get-Content -Path .env) -replace 'SERVER_URL=.*', 'SERVER_URL=!ngrokurl!' | Set-Content -Path .env"
)

:: Start the server
echo.
echo Starting server with environment...
echo.
echo SERVER_URL=!SERVER_URL!
echo.
echo ========================================================
echo    SERVER STARTING - PRESS CTRL+C TO STOP
echo ========================================================
echo.

:: Run server
node server.js

ENDLOCAL