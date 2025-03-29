@echo off
echo Checking frontend files...
cd frontend

if exist src\components\enhanced-stats-cards.tsx (
  echo Enhanced Stats Cards: Found
) else (
  echo Enhanced Stats Cards: Missing!
)

if exist src\components\enhanced-calls-chart.tsx (
  echo Enhanced Calls Chart: Found
) else (
  echo Enhanced Calls Chart: Missing!
)

if exist src\components\enhanced-recent-calls.tsx (
  echo Enhanced Recent Calls: Found
) else (
  echo Enhanced Recent Calls: Missing!
)

if exist src\components\ui\chart.tsx (
  echo Chart Component: Found
) else (
  echo Chart Component: Missing!
)

if exist src\components\ui\separator.tsx (
  echo Separator Component: Found
) else (
  echo Separator Component: Missing!
)

if exist src\app\page.tsx (
  echo Main Dashboard Page: Found
) else (
  echo Main Dashboard Page: Missing!
)
