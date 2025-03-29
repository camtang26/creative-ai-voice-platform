@echo off
echo MongoDB Integration Tests
echo =======================
echo.

echo Starting MongoDB server...
echo (Make sure MongoDB is installed and running)
echo.

echo Running basic API tests...
node test-mongodb-api.js
echo.

echo Running performance tests...
node test-mongodb-performance.js
echo.

echo Running campaign and contact tests...
node test-mongodb-campaign.js
echo.

echo All tests completed!
pause