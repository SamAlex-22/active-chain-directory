@echo off
title Active Chain Directory - Startup Manager
color 0b

echo =====================================================================
echo           ACTIVE CHAIN DIRECTORY (ACD) - ENTERPRISE SOC
echo                 Automated Local Stack Launch Sequence
echo =====================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/5] Starting Local Hardhat Blockchain Node (Port 8545)...
start "ACD - 1. Blockchain Node (Port 8545)" cmd /k "cd /d "%ROOT_DIR%" && npx hardhat node"

echo Waiting for Hardhat JSON-RPC node to initialize on port 8545...
powershell -NoProfile -Command "$ready = $false; for ($i=0; $i -lt 25; $i++) { try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 8545); if ($client.Connected) { $client.Close(); $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 800 }; if (-not $ready) { Write-Host 'Warning: Timed out waiting for port 8545'; exit 1 }"

echo.
echo [2/5] Deploying Smart Contracts to Local Node...
call npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Deployment had an issue. Please verify Hardhat Node is running.
) else (
    echo [SUCCESS] Smart contracts deployed & ABIs synced to frontend.
)

echo.
echo [3/5] Starting SIEM Event Indexer Backend (Port 3001)...
start "ACD - 2. SIEM Indexer (Port 3001)" cmd /k "cd /d "%ROOT_DIR%backend" && node src/server.js"

echo.
echo [4/5] Starting AI Risk Engine FastAPI Microservice (Port 8000)...
start "ACD - 3. AI Risk Engine (Port 8000)" cmd /k "cd /d "%ROOT_DIR%ai-engine" && python -m uvicorn risk_api:app --reload --port 8000"

echo.
echo [5/5] Starting Web3 Cyber Command Center Frontend (Port 5174)...
start "ACD - 4. Web3 Frontend (Port 5174)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo Waiting for Vite dev server to warm up...
timeout /t 3 /nobreak >nul

echo.
echo Launching Cyber Command Center in your default browser...
start http://localhost:5174

echo.
echo =====================================================================
echo   ALL ACD SERVICES RUNNING:
echo   - EVM Node:        http://127.0.0.1:8545 (Chain ID: 31337)
echo   - SIEM Indexer:    http://localhost:3001
echo   - AI Risk Engine:  http://localhost:8000 (Swagger: /docs)
echo   - Web3 Frontend:   http://localhost:5174
echo.
echo   Keep the service console windows open while testing.
echo   To shut down all services, run stop_all.bat
echo =====================================================================
echo.
pause
