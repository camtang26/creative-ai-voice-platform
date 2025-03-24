@echo off
echo Stopping all Node.js servers and ngrok processes...

:: Kill any Node.js processes running on port 8000 (standard server)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') DO (
  echo Killing process on port 8000 (PID: %%P)
  taskkill /F /PID %%P
)

:: Kill any Node.js processes running on port 8001 (optimized server)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') DO (
  echo Killing process on port 8001 (PID: %%P)
  taskkill /F /PID %%P
)

:: Kill any ngrok processes
taskkill /F /IM ngrok.exe 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Killed ngrok processes
) else (
  echo No running ngrok processes found
)

:: Kill all Node.js processes (uncomment if needed)
:: taskkill /F /IM node.exe
:: echo Killed all Node.js processes

echo.
echo Done! All local servers and ngrok processes have been stopped.
echo You can now safely use the Railway app without port conflicts.
echo.
pause