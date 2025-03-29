@echo off
echo.
echo === Enhanced Twilio Integration Tests ===
echo.
echo This script will test the enhanced Twilio integration:
echo  1. Call recording 
echo  2. Automatic call termination
echo  3. Enhanced data streaming
echo.
echo Make sure your server is running before proceeding!
echo.
echo Press any key to start the tests...
pause > nul

node test-enhancements.js

echo.
echo Tests completed. Press any key to exit...
pause > nul