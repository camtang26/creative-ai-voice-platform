@echo off
echo Clearing Next.js cache...
rmdir /s /q .next
rmdir /s /q node_modules\.cache
echo Next.js cache cleared.
echo Please restart your development server with: npm run dev
