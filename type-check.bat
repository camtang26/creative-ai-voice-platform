@echo off
echo Checking TypeScript errors...
cd frontend
npx tsc --noEmit
