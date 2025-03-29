@echo off
ECHO Running test call using Node.js script...
ECHO.

IF "%1"=="" (
  ECHO Usage: simple-call.bat +1234567890
  EXIT /B
)

ECHO Phone number: %1
ECHO.

node test-call.js %1

ECHO.
ECHO Call initiated. Check server logs for details.
