@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Investor Signals Production Server (Local)

:: Establish color codes
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "RESET=[0m"

:: Display banner
echo %CYAN%
echo ========================================================
echo    INVESTOR SIGNALS PRODUCTION SERVER (LOCAL)
echo ========================================================
echo %RESET%

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%ERROR: Node.js is not installed or not in your PATH%RESET%
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "ngrok.exe" (
        echo %YELLOW%Found ngrok.exe in the current directory%RESET%
    ) else (
        echo %RED%ERROR: ngrok is not installed or not in your PATH%RESET%
        echo Please install ngrok from https://ngrok.com/download
        pause
        exit /b 1
    )
)

:: Verify environment file exists
if not exist ".env.local" (
    echo %RED%ERROR: .env.local file not found!%RESET%
    echo The server requires a proper environment configuration.
    pause
    exit /b 1
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Get current date and time for log file names
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set logdate=!datetime:~0,8!-!datetime:~8,6!

:: Extract ngrok authtoken from environment file
for /f "tokens=2 delims==" %%a in ('findstr /I "NGROK_AUTHTOKEN" .env.local') do set NGROK_AUTHTOKEN=%%a
if "!NGROK_AUTHTOKEN!" == "" (
    echo %YELLOW%WARNING: NGROK_AUTHTOKEN not found in .env.local%RESET%
    echo %YELLOW%Using default authentication method%RESET%
) else (
    echo %GREEN%NGROK_AUTHTOKEN found, updating configuration...%RESET%
    
    :: Update ngrok.yml with authtoken
    powershell -Command "(Get-Content -Path ngrok.yml) -replace 'authtoken: .*', 'authtoken: !NGROK_AUTHTOKEN!' | Set-Content -Path ngrok.yml"
    echo %GREEN%ngrok.yml updated with authtoken%RESET%
)

:: Kill any running ngrok processes
echo %YELLOW%Stopping any running ngrok processes...%RESET%
taskkill /f /im ngrok.exe >nul 2>nul

:: Start ngrok in a new window
echo %GREEN%Starting ngrok with custom configuration...%RESET%
start "Ngrok Tunnel" cmd /c "ngrok start --config=ngrok.yml --all > logs\ngrok-!logdate!.log"

:: Wait for ngrok to initialize and capture the public URL
echo %YELLOW%Waiting for ngrok to initialize...%RESET%
timeout /t 5 /nobreak >nul

:: Create a temporary file for the JSON output
set TEMP_JSON_FILE=ngrok_tunnels_temp.json

:: Attempt to get ngrok URL from API
echo %YELLOW%Retrieving ngrok URL...%RESET%
set RETRY_COUNT=0
set MAX_RETRIES=5

:RETRY_GET_URL
set /a RETRY_COUNT+=1
curl -s http://localhost:4040/api/tunnels > %TEMP_JSON_FILE%

:: Use PowerShell to properly extract the URL (specifically looking for https tunnels)
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content -Raw %TEMP_JSON_FILE% | ConvertFrom-Json).tunnels | Where-Object {$_.proto -eq 'https'} | Select-Object -ExpandProperty public_url"') do (
    set ngrokurl=%%a
)

:: Delete temporary file
del %TEMP_JSON_FILE%

:: Check if we got a valid URL
if "!ngrokurl!" == "" (
    if !RETRY_COUNT! LSS !MAX_RETRIES! (
        echo %YELLOW%Attempt !RETRY_COUNT! failed. Waiting for ngrok to initialize...%RESET%
        timeout /t 3 /nobreak >nul
        goto RETRY_GET_URL
    ) else (
        echo %RED%Failed to get ngrok URL after !MAX_RETRIES! attempts.%RESET%
        echo %YELLOW%Using default SERVER_URL=http://localhost:8000%RESET%
        set SERVER_URL=http://localhost:8000
    )
) else (
    echo %GREEN%Ngrok URL: !ngrokurl!%RESET%
    set SERVER_URL=!ngrokurl!
    
    :: Update the .env.local file with the ngrok URL
    echo %YELLOW%Updating .env.local with ngrok URL...%RESET%
    powershell -Command "(Get-Content -Path .env.local) -replace 'SERVER_URL=.*', 'SERVER_URL=!ngrokurl!' | Set-Content -Path .env.local"
    
    :: Add server location for latency tracking
    powershell -Command "(Get-Content -Path .env.local) -replace 'SERVER_LOCATION=.*', 'SERVER_LOCATION=Local (ngrok)' | Set-Content -Path .env.local"
    if %ERRORLEVEL% NEQ 0 (
        powershell -Command "Add-Content -Path .env.local -Value 'SERVER_LOCATION=Local (ngrok)'"
    )
)

:: Update webhook URL in ElevenLabs if environment variables exist
if exist ".env.local" (
    for /f "tokens=2 delims==" %%a in ('findstr /I "ELEVENLABS_API_KEY" .env.local') do set EL_API_KEY=%%a
    if not "!EL_API_KEY!" == "" (
        echo %YELLOW%Checking if ElevenLabs webhook needs updating...%RESET%
        
        :: Use curl to update webhook - this is a simplified example and may need adjustments
        echo %CYAN%NOTE: Manual webhook update may be required in the ElevenLabs dashboard.%RESET%
        echo %CYAN%URL to set: !ngrokurl!/webhooks/elevenlabs%RESET%
    )
)

:: Start the server with the local environment file
echo.
echo %GREEN%Starting production server with local environment...%RESET%
echo.
echo %CYAN%SERVER_URL=!SERVER_URL!%RESET%
echo.
echo %CYAN%========================================================%RESET%
echo %CYAN%    SERVER STARTING - PRESS CTRL+C TO STOP%RESET%
echo %CYAN%========================================================%RESET%
echo.

:: Set environment variables for production-like settings
set NODE_ENV=production
:: Use local environment file
node -r dotenv/config server.js dotenv_config_path=.env.local

ENDLOCAL