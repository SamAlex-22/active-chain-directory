@echo off
title Active Chain Directory - Shutdown Manager
color 0c

echo =====================================================================
echo           ACTIVE CHAIN DIRECTORY (ACD) - SHUTDOWN MANAGER
echo                 Stopping all running microservices
echo =====================================================================
echo.

echo Stopping Node.js processes (Hardhat, Backend SIEM, Vite Frontend)...
taskkill /F /IM node.exe >nul 2>&1

echo Stopping Python processes (FastAPI AI Risk Engine)...
taskkill /F /IM python.exe >nul 2>&1

echo.
echo [DONE] All ACD services stopped successfully.
echo.
pause
