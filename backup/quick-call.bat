@echo off
SETLOCAL EnableDelayedExpansion

:: Set terminal title
title Quick Call Helper

:: Display banner
echo.
echo ========================================================
echo    INVESTOR SIGNALS QUICK CALL HELPER
echo ========================================================
echo.

:: Check if a phone number was provided
if "%~1"=="" (
    echo Please provide a phone number.
    echo Usage: quick-call.bat +61412345678 [custom message]
    goto :EOF
)

set PHONE_NUMBER=%~1
set CUSTOM_MESSAGE=%~2

:: If no custom message provided, use default
if "%CUSTOM_MESSAGE%"=="" (
    set CUSTOM_MESSAGE=Hello, this is Investor Signals AI assistant in training. How are you today?
)

:: Extract server URL from .env file
for /f "tokens=2 delims==" %%a in ('findstr /I "SERVER_URL" .env') do set SERVER_URL=%%a

:: Validate URL
set URL_VALID=0
if "!SERVER_URL:http=!" NEQ "!SERVER_URL!" set URL_VALID=1

if %URL_VALID% EQU 0 (
    echo ERROR: Invalid SERVER_URL in .env file: !SERVER_URL!
    echo Falling back to default URL: http://localhost:8000
    set SERVER_URL=http://localhost:8000
)

echo Making a call to %PHONE_NUMBER%
echo Using server: !SERVER_URL!
echo Custom message: %CUSTOM_MESSAGE%

:: Execute the make-call.js script
node make-call.js %PHONE_NUMBER% "You are a helpful assistant making a phone call. Be friendly and professional." "%CUSTOM_MESSAGE%" "!SERVER_URL!"

ENDLOCAL