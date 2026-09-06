@echo off
title Active Chain Directory - Demo State Reset
color 0e

echo =====================================================================
echo           ACTIVE CHAIN DIRECTORY (ACD) - DEMO RESET UTILITY
echo              Resetting database and redeploying contracts
echo =====================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Clearing SQLite SIEM and Approval records...
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('backend/audit_logs.db'); db.serialize(() => { db.run('DELETE FROM events'); db.run('DELETE FROM approvals'); db.run('VACUUM'); console.log('   -> Cleared events and approvals tables.'); });"

echo.
echo [2/3] Redeploying smart contracts to Hardhat local node...
call npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Could not connect to Hardhat node. Ensure Hardhat is running on port 8545.
) else (
    echo [SUCCESS] Contracts redeployed with fresh state.
)

echo.
echo [3/3] Syncing latest AssetNFT ABI...
node -e "const fs = require('fs'); if (fs.existsSync('artifacts/contracts/AssetNFT.sol/AssetNFT.json')) { const art = JSON.parse(fs.readFileSync('artifacts/contracts/AssetNFT.sol/AssetNFT.json', 'utf8')); fs.writeFileSync('frontend/src/contracts/AssetNFT.json', JSON.stringify(art.abi, null, 2)); console.log('   -> Exported AssetNFT ABI to frontend.'); }"

echo.
echo =====================================================================
echo   DEMO STATE RESET COMPLETE!
echo   - SQLite logs and tickets reset to clean baseline.
echo   - Fresh smart contracts deployed with AI validator.
echo   - Ready for SIH Judge Demonstration!
echo =====================================================================
echo.
pause
