@echo off
echo.
echo Deploying to US-East-1 region...
echo.
set RAILWAY_REGION=us-east-1
railway up --region us-east-1

echo.
echo Getting domain...
for /f "tokens=*" %%a in ('railway domain') do set DOMAIN=%%a
echo Your domain is: %DOMAIN%

echo.
echo Setting SERVER_URL environment variable...
railway variables --set "SERVER_URL=%DOMAIN%"

echo.
echo Redeploying to apply SERVER_URL...
railway up --region us-east-1

echo.
echo Deployment completed successfully!
echo Your server is now running at: %DOMAIN%
echo Update your Twilio webhook URLs to point to this domain.
echo.
