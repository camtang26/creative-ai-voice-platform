@echo off
SETLOCAL EnableDelayedExpansion

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Get current date and time for log file name
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set logdate=!datetime:~0,8!-!datetime:~8,6!

:: Kill any running ngrok processes
taskkill /f /im ngrok.exe >nul 2>&1

:: Set path to ngrok executable
set NGROK_PATH=ngrok.exe
if not exist "%NGROK_PATH%" set NGROK_PATH=.\ngrok.exe

:: Check if ngrok exists in the specified path
if not exist "%NGROK_PATH%" (
    echo ERROR: ngrok executable not found.
    echo Please ensure ngrok.exe is in the current directory or in your PATH.
    exit /b 1
)

:: Start ngrok with direct command line options
echo Starting ngrok on port 8000...
start "Ngrok Tunnel" /B %NGROK_PATH% http 8000 --log=stdout > logs\ngrok-!logdate!.log

:: Wait a moment for ngrok to start
timeout /t 3 /nobreak > nul

:: Try to get the ngrok URL
echo Retrieving ngrok URL...
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels ^| findstr "public_url"') do (
    set FOUND_URL=%%i
    echo Found URL: !FOUND_URL!
    for /f "tokens=2 delims=:}" %%j in ("!FOUND_URL!") do (
        set NGROK_URL=%%j
        set NGROK_URL=!NGROK_URL:"=!
        set NGROK_URL=!NGROK_URL:,=!
        echo.
        echo ========================================
        echo NGROK URL: !NGROK_URL!
        echo ========================================
        echo.
        
        :: Write the URL to a file for the server to read
        echo !NGROK_URL! > ngrok_url.txt
    )
)

echo If you don't see a URL above, you can check:
echo 1. Open http://localhost:4040 in your browser
echo 2. Look for the URL in the logs\ngrok-!logdate!.log file

ENDLOCAL
