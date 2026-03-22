@echo off
echo Stopping Daze dev server on port 8082...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8082" ^| findstr "LISTENING"') do (
    echo Killing process %%a
    taskkill /PID %%a /F
)
echo Done.
pause
