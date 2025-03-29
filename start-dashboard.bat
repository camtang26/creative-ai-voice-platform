@echo off
echo =================================
echo Starting ElevenLabs Calling Dashboard
echo =================================

:: Check if we're in the correct directory
IF NOT EXIST server.js (
    echo ERROR: This script must be run from the project root directory
    echo Current directory: %CD%
    echo Please navigate to the project root directory
    pause
    exit /b 1
)

echo Starting backend server...
start cmd /k "title ElevenLabs Backend Server && node --experimental-modules server.js"

echo Waiting for backend to initialize...
timeout /t 5

echo Starting frontend dashboard...
start cmd /k "title ElevenLabs Frontend Dashboard && cd frontend && npm run dev"

echo =================================
echo Dashboard started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo =================================

echo Press any key to close all servers
pause > nul

echo Shutting down servers...
taskkill /f /im node.exe
