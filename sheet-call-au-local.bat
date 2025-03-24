@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Local Sheet Call (AU Region)

echo.
echo ========================================================
echo    SHEET CALL USING LOCAL SERVER (AU REGION)
echo ========================================================
echo.

:: Check if spreadsheet ID is provided
if "%~1"=="" (
    echo ERROR: No spreadsheet ID provided.
    echo Usage: sheet-call-au-local.bat SPREADSHEET_ID [SHEET_NAME] [MAX_CALLS]
    exit /b 1
)

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
echo Starting AU region sheet call with local environment...
node -r dotenv/config sheet-call-au.js %* dotenv_config_path=.env.local

ENDLOCAL