@echo off
echo ====================================================
echo      PREPARE RAILWAY.APP DEPLOYMENT PACKAGE
echo ====================================================
echo This script will create a package ready for Railway.app deployment
echo.

cd %~dp0
node deployment\prepare-railway.js

echo.
echo Package preparation complete!
echo Please follow the instructions in deployment\RAILWAY-DEPLOYMENT.md
echo.
pause
