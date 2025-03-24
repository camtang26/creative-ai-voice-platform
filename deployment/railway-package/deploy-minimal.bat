@echo off
echo ====================================================
echo     DEPLOY MINIMAL AUSTRALIA-REGION VERSION
echo ====================================================
echo This script will apply the minimal changes needed
echo to use Twilio AU region without all the optimizations
echo that might be causing issues.
echo.

REM Make backup of current files
if exist server.js.bak del server.js.bak
if exist outbound.js.bak del outbound.js.bak
copy server.js server.js.bak
copy outbound.js outbound.js.bak

REM Replace with minimal versions
copy server-minimal.js server.js
copy outbound-minimal.js outbound.js

echo Files replaced with minimal versions.
echo Original files backed up as *.bak

echo.
echo Next steps:
echo 1. Deploy to Railway:
echo    railway up
echo.
echo 2. After deployment, check if the server is now responding
echo    to requests by running:
echo    node C:\Users\wowca\Cursor Projects\Twilio Node.js server\elevenlabs-outbound-calling\make-call-debug.js
echo.
echo 3. To restore original files:
echo    copy server.js.bak server.js
echo    copy outbound.js.bak outbound.js
echo.
echo ====================================================
echo.
pause