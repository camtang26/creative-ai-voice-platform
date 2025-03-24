@echo off
echo ====================================================
echo        DEPLOY TO VERCEL (US-EAST REGION)
echo ====================================================
echo This script will deploy your Twilio-ElevenLabs server to Vercel in US-East region.
echo.
echo Prerequisites:
echo - Node.js installed
echo.

cd %~dp0
node deployment\deploy-to-vercel.js

echo.
pause
