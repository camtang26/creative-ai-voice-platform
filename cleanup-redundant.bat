@echo off
SETLOCAL

echo Cleaning up redundant files...

:: Redundant sheet-call scripts
if exist "sheet-call-au.js" (
    echo Removing sheet-call-au.js
    del "sheet-call-au.js"
)

if exist "sheet-call-fixed.js" (
    echo Removing sheet-call-fixed.js
    del "sheet-call-fixed.js"
)

if exist "sheet-call-modified.js" (
    echo Removing sheet-call-modified.js
    del "sheet-call-modified.js"
)

:: Redundant start scripts
if exist "start-local-server.bat" (
    echo Removing start-local-server.bat
    del "start-local-server.bat"
)

if exist "start-production-server.bat" (
    echo Removing start-production-server.bat
    del "start-production-server.bat"
)

if exist "setup-local-production.bat" (
    echo Removing setup-local-production.bat
    del "setup-local-production.bat"
)

if exist "deploy-au-optimized.bat" (
    echo Removing deploy-au-optimized.bat
    del "deploy-au-optimized.bat"
)

if exist "LOCAL-PRODUCTION-SETUP.md" (
    echo Removing LOCAL-PRODUCTION-SETUP.md
    del "LOCAL-PRODUCTION-SETUP.md"
)

:: Clean up redundant env files
if exist ".env.local" (
    echo Removing .env.local
    del ".env.local"
)

if exist "ngrok.yml" (
    echo Removing ngrok.yml
    del "ngrok.yml"
)

if exist "install-as-service.ps1" (
    echo Removing install-as-service.ps1
    del "install-as-service.ps1"
)

echo Cleanup complete!
echo.
echo Your setup is now simplified to:
echo - start.bat to start the server
echo - sheet-call.js for making calls from Google Sheets
echo.
echo Please update the webhook URL in ElevenLabs dashboard when the server is running.

ENDLOCAL