@echo off
echo ====================================================
echo        DEPLOY TO AWS LIGHTSAIL (US-EAST REGION)
echo ====================================================
echo This script will deploy your Twilio-ElevenLabs server to AWS Lightsail in US-East-1 region.
echo.
echo Prerequisites:
echo - AWS CLI installed and configured with your credentials
echo - Node.js installed
echo.

cd %~dp0
node deployment\deploy-to-aws.js

echo.
pause
