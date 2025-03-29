@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Investor Signals Production Server (Local)

echo ========================================================
echo    INVESTOR SIGNALS PRODUCTION SERVER (LOCAL)
echo ========================================================
echo.

:: Start ngrok in a separate process
echo Starting ngrok...
call start-ngrok.bat

:: Wait for ngrok to initialize
echo Waiting for ngrok to start...
timeout /t 5 /nobreak > nul

:: Try to read the ngrok URL from the file
if exist "ngrok_url.txt" (
    set /p NGROK_URL=<ngrok_url.txt
    echo Using ngrok URL: !NGROK_URL!
    
    :: Update .env.local with the ngrok URL
    echo Updating .env.local with ngrok URL...
    powershell -Command "(Get-Content -Path .env.local) -replace 'SERVER_URL=.*', 'SERVER_URL=!NGROK_URL!' | Set-Content -Path .env.local"
) else (
    echo WARNING: Could not get ngrok URL. Using default URL.
    echo You can manually update the URL in .env.local after checking http://localhost:4040
)

:: Start the server with the local environment file
echo.
echo Starting production server with local environment...
echo.
echo ========================================================
echo    SERVER STARTING - PRESS CTRL+C TO STOP
echo ========================================================
echo.

:: Set environment variables for production-like settings
set NODE_ENV=production
:: Use local environment file
node -r dotenv/config server.js dotenv_config_path=.env.local

ENDLOCAL
