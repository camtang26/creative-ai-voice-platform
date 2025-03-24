@echo off
echo ====================================================
echo        ELEVENLABS TWILIO LOW-LATENCY SERVER         
echo ====================================================
echo.
echo This will start the optimized server with lower latency.
echo.

cd %~dp0
node optimized\start-optimized-server.js %*
