import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const RPC_URL = "http://127.0.0.1:8545";

// Load ABIs and configs dynamically
const contractConfigPath = path.resolve(__dirname, '../../frontend/src/contracts/contract-config.json');
const auditRegistryAbiPath = path.resolve(__dirname, '../../frontend/src/contracts/AuditRegistry.json');

const contractConfig = JSON.parse(fs.readFileSync(contractConfigPath, 'utf8'));
const AuditRegistryABI = JSON.parse(fs.readFileSync(auditRegistryAbiPath, 'utf8'));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const auditRegistry = new ethers.Contract(contractConfig.AuditRegistry, AuditRegistryABI, provider);

// Listen to SystemLog
// event SystemLog(string action, address indexed actor, uint256 indexed assetId, string details, uint256 timestamp);
// In Ethers v6, the listener arguments are the decoded event args followed by the EventLog object.
auditRegistry.on("SystemLog", (action, actor, assetId, details, timestamp, event) => {
  const txHash = event.log ? event.log.transactionHash : "Unknown";
  console.log(`[SystemLog] action=${action} actor=${actor} assetId=${assetId} tx=${txHash}`);
  
  db.run(
    `INSERT INTO events (action, actor, assetId, details, timestamp, txHash) VALUES (?, ?, ?, ?, ?, ?)`,
    [action, actor, Number(assetId), details, Number(timestamp), txHash],
    function(err) {
      if (err) console.error("Error inserting event to DB:", err);
    }
  );
});

console.log("Listening for SystemLog events on AuditRegistry:", contractConfig.AuditRegistry);

// API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/logs', (req, res) => {
  db.all(`SELECT * FROM events ORDER BY timestamp DESC LIMIT 100`, [], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch logs" });
    } else {
      res.json(rows);
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Indexer backend running on http://localhost:${PORT}`);
  });
}

export default app;
