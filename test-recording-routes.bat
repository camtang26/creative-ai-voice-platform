@echo off
REM Script to test recording download routes

if "%1"=="" (
  echo ERROR: Please provide a recording SID as an argument.
  echo Example: test-recording-routes.bat RE123456789abcdef
  exit /b 1
)

echo Testing recording download routes with SID: %1

REM Run with local server by default 
set BASE_URL=http://localhost:8000
node test-recording-download.js %1

echo.
echo To test against Railway, run: 
echo set BASE_URL=https://your-railway-url.railway.app ^&^& test-recording-routes.bat %1
echo.
echo To test against Render, run:
echo set BASE_URL=https://your-render-url.onrender.com ^&^& test-recording-routes.bat %1
