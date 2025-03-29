@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title ElevenLabs-Twilio Latency Test

:: Display banner
echo.
echo ========================================================
echo    ELEVENLABS-TWILIO LATENCY TEST TOOL
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

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Get current date and time for log file names
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set logdate=!datetime:~0,8!-!datetime:~8,6!

echo Starting latency test...
echo.
echo Results will be saved to logs\latency-test-!logdate!.log
echo.

:: Run the latency test
node latency-test.js | tee logs\latency-test-!logdate!.log

echo.
echo Test complete! Results saved to logs\latency-test-!logdate!.log
echo.

ENDLOCAL