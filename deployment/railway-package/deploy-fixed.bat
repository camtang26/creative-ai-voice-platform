@echo off
echo.
echo Deploying to US-East-1 region...
echo.
set RAILWAY_REGION=us-east-1

REM Deploy without the --region flag
railway up

echo.
echo Getting domain...
for /f "tokens=*" %%a in ('railway domain') do set DOMAIN=%%a
echo Your domain is: %DOMAIN%

echo.
echo Setting SERVER_URL environment variable...
railway variables --set "SERVER_URL=%DOMAIN%"

echo.
echo Redeploying to apply SERVER_URL...
railway up

echo.
echo Deployment completed successfully!
echo Your server is now running at: %DOMAIN%
echo Update your Twilio webhook URLs to point to this domain.
echo.
