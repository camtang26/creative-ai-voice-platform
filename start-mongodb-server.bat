<![CDATA[@echo off
echo ElevenLabs/Twilio MongoDB Enhanced Server (Railway Mode)
echo =======================================================
echo.
echo Starting MongoDB-enhanced server...
echo Ensure SERVER_URL is set correctly in your .env file or environment variables.
echo Expected URL for production: https://twilioel-production.up.railway.app
echo.
echo Press Ctrl+C to stop the server.
echo.
node server-mongodb.js
echo Server stopped.]]>