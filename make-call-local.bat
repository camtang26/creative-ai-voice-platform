@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Local Make Call

echo.
echo ========================================================
echo    MAKE CALL USING LOCAL SERVER
echo ========================================================
echo.

:: Read the server URL from .env.local
for /f "tokens=2 delims==" %%a in ('findstr /I "SERVER_URL" .env.local') do set LOCAL_SERVER_URL=%%a

if "!LOCAL_SERVER_URL!"=="" (
    echo ERROR: SERVER_URL not found in .env.local
    exit /b 1
)

:: Display the server URL that will be used
echo Using server URL: !LOCAL_SERVER_URL!
echo.

:: Export environment variables
set SERVER_URL=!LOCAL_SERVER_URL!

:: Run the script with the local environment
echo Starting make-call with local environment...
node -r dotenv/config make-call.js %* dotenv_config_path=.env.local

ENDLOCAL