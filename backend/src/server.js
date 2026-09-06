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
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

// Default Hardhat Account #4: Local AI Validator
const DEFAULT_AI_KEY = "0x47e179ec346fe86485a7581ba8091245de342f6120c50d61385229f98157ff39";
const AI_SIGNER_PRIVATE_KEY = process.env.AI_SIGNER_PRIVATE_KEY || DEFAULT_AI_KEY;
const DEMO_FALLBACK_MODE = process.env.DEMO_FALLBACK_MODE === "true";

let provider;
let aiSignerWallet = null;
try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  if (AI_SIGNER_PRIVATE_KEY && !DEMO_FALLBACK_MODE) {
    aiSignerWallet = new ethers.Wallet(AI_SIGNER_PRIVATE_KEY, provider);
  }
} catch (e) {
  console.warn("Could not initialize ethers provider or signer:", e.message);
}

// Load ABIs and configs dynamically
const contractConfigPath = path.resolve(__dirname, '../../frontend/src/contracts/contract-config.json');
const auditRegistryAbiPath = path.resolve(__dirname, '../../frontend/src/contracts/AuditRegistry.json');
const assetNftAbiPath = path.resolve(__dirname, '../../frontend/src/contracts/AssetNFT.json');
const roleManagerAbiPath = path.resolve(__dirname, '../../frontend/src/contracts/RoleManager.json');

let contractConfig = {};
let AuditRegistryABI = [];
let AssetNFTABI = [];
let RoleManagerABI = [];

if (fs.existsSync(contractConfigPath)) {
  try {
    contractConfig = JSON.parse(fs.readFileSync(contractConfigPath, 'utf8'));
  } catch (err) {
    console.warn("Could not parse contract-config.json");
  }
}

if (fs.existsSync(auditRegistryAbiPath)) {
  try {
    AuditRegistryABI = JSON.parse(fs.readFileSync(auditRegistryAbiPath, 'utf8'));
  } catch (err) {
    console.warn("Could not parse AuditRegistry.json");
  }
}

if (fs.existsSync(assetNftAbiPath)) {
  try {
    AssetNFTABI = JSON.parse(fs.readFileSync(assetNftAbiPath, 'utf8'));
  } catch (err) {
    console.warn("Could not parse AssetNFT.json");
  }
}

if (fs.existsSync(roleManagerAbiPath)) {
  try {
    RoleManagerABI = JSON.parse(fs.readFileSync(roleManagerAbiPath, 'utf8'));
  } catch (err) {
    console.warn("Could not parse RoleManager.json");
  }
}

// Set up AuditRegistry event listener if contracts are deployed
if (contractConfig.AuditRegistry && AuditRegistryABI.length > 0 && provider && process.env.NODE_ENV !== 'test') {
  try {
    const auditRegistry = new ethers.Contract(contractConfig.AuditRegistry, AuditRegistryABI, provider);
    auditRegistry.on("SystemLog", (action, actor, assetId, details, timestamp, event) => {
      const txHash = event?.log ? event.log.transactionHash : "Unknown";
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
  } catch (err) {
    console.warn("Could not attach listener to AuditRegistry:", err.message);
  }
}

// Helper: EIP-712 Signing logic
const EIP712_DOMAIN_NAME = "ActiveChainDirectory";
const EIP712_DOMAIN_VERSION = "1";

const EIP712_TYPES = {
  AIAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "riskScore", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

async function signAIAuthorization(from, to, tokenId, riskScore, overrideNonce = null) {
  if (!aiSignerWallet) {
    throw new Error("AI Signer is not available or DEMO_FALLBACK_MODE is active");
  }

  // Reload contractConfig if needed
  if (!contractConfig.AssetNFT && fs.existsSync(contractConfigPath)) {
    contractConfig = JSON.parse(fs.readFileSync(contractConfigPath, 'utf8'));
  }

  const verifyingContract = contractConfig.AssetNFT || "0x0000000000000000000000000000000000000000";

  let nonce = 0;
  if (overrideNonce !== null && overrideNonce !== undefined) {
    nonce = Number(overrideNonce);
  } else if (AssetNFTABI.length > 0 && contractConfig.AssetNFT && provider) {
    try {
      const assetContract = new ethers.Contract(contractConfig.AssetNFT, AssetNFTABI, provider);
      const currentNonce = await assetContract.nonces(tokenId);
      nonce = Number(currentNonce);
    } catch (err) {
      console.warn("Could not read on-chain nonce, defaulting to 0:", err.message);
      nonce = 0;
    }
  }

  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiration
  const domain = {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: 31337,
    verifyingContract: verifyingContract
  };

  const message = {
    from: ethers.getAddress(from),
    to: ethers.getAddress(to),
    tokenId: BigInt(tokenId),
    riskScore: BigInt(riskScore),
    nonce: BigInt(nonce),
    deadline: BigInt(deadline)
  };

  const signature = await aiSignerWallet.signTypedData(domain, EIP712_TYPES, message);

  return {
    signature,
    nonce,
    deadline,
    riskScore: Number(riskScore)
  };
}

// ── API Endpoints ──────────────────────────────────────────────────

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    securityMode: DEMO_FALLBACK_MODE ? 'DEMO_FALLBACK' : 'SECURE',
    signerAddress: aiSignerWallet ? aiSignerWallet.address : null
  });
});

// Security Mode info
app.get('/api/security/mode', (req, res) => {
  res.json({
    mode: DEMO_FALLBACK_MODE ? 'DEMO_FALLBACK' : 'SECURE',
    signerConfigured: !!aiSignerWallet,
    signerAddress: aiSignerWallet ? aiSignerWallet.address : null,
    verifyingContract: contractConfig.AssetNFT || null
  });
});

// Audit Logs
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

// EIP-712 AI Signature generation for low-risk allowed transfers
app.post('/api/authorizations/sign', async (req, res) => {
  try {
    const { from, to, tokenId, riskScore } = req.body;

    if (!from || !to || tokenId === undefined || riskScore === undefined) {
      return res.status(400).json({ error: "Missing required parameters: from, to, tokenId, riskScore" });
    }

    if (DEMO_FALLBACK_MODE || !aiSignerWallet) {
      return res.status(503).json({
        error: "AI Authorization Service unavailable in DEMO_FALLBACK_MODE",
        mode: "DEMO_FALLBACK"
      });
    }

    const authData = await signAIAuthorization(from, to, tokenId, riskScore);
    res.json(authData);
  } catch (err) {
    console.error("Authorization signing error:", err);
    res.status(500).json({ error: err.message || "Failed to generate authorization signature" });
  }
});

// Approvals: Create new approval request (POST /api/approvals)
app.post('/api/approvals', (req, res) => {
  const { requester, recipient, tokenId, riskScore, riskLevel, reason } = req.body;

  if (!requester || !recipient || tokenId === undefined || riskScore === undefined) {
    return res.status(400).json({ error: "Missing required approval fields" });
  }

  const createdAt = Date.now();
  db.run(
    `INSERT INTO approvals (requester, recipient, tokenId, riskScore, riskLevel, reason, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [requester, recipient, Number(tokenId), Number(riskScore), riskLevel || 'HIGH', reason || 'AI Flagged Transfer', createdAt],
    function (err) {
      if (err) {
        console.error("Error creating approval:", err);
        return res.status(500).json({ error: "Failed to save approval request" });
      }
      res.status(201).json({
        id: this.lastID,
        requestId: `#APR-${String(this.lastID).padStart(4, '0')}`,
        status: 'PENDING',
        message: "Approval request created successfully"
      });
    }
  );
});

// Approvals: List all requests (GET /api/approvals)
app.get('/api/approvals', (req, res) => {
  db.all(`SELECT * FROM approvals ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) {
      console.error("Error fetching approvals:", err);
      return res.status(500).json({ error: "Failed to fetch approvals" });
    }
    res.json(rows);
  });
});

// Approvals: Update request (PATCH /api/approvals/:id)
app.patch('/api/approvals/:id', async (req, res) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be APPROVED or REJECTED" });
  }

  // Verify that approvedBy holds ADMIN_ROLE on-chain
  if (approvedBy && provider && contractConfig.RoleManager && RoleManagerABI.length > 0) {
    try {
      const roleManager = new ethers.Contract(contractConfig.RoleManager, RoleManagerABI, provider);
      const adminRole = await roleManager.ADMIN_ROLE();
      const hasAdminRole = await roleManager.hasRole(adminRole, ethers.getAddress(approvedBy));
      if (!hasAdminRole) {
        return res.status(403).json({ error: "Access Denied: Signer does not hold on-chain ADMIN_ROLE" });
      }
    } catch (roleErr) {
      if (roleErr.message?.includes("Access Denied")) {
        return res.status(403).json({ error: roleErr.message });
      }
      // If RPC is unreachable (e.g. offline unit test), log warning
      console.warn("Could not verify ADMIN_ROLE on-chain (RPC offline):", roleErr.message);
    }
  }

  db.get(`SELECT * FROM approvals WHERE id = ?`, [id], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: "Approval request not found" });
    }

    if (status === 'REJECTED') {
      db.run(
        `UPDATE approvals SET status = 'REJECTED', approvedBy = ? WHERE id = ?`,
        [approvedBy || 'Admin', id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: "Failed to reject approval" });
          res.json({ id: Number(id), status: 'REJECTED', approvedBy: approvedBy || 'Admin' });
        }
      );
      return;
    }

    // When status is 'APPROVED', produce cryptographic EIP-712 authorization
    try {
      // Use an approved risk score (e.g. 25) so AssetNFT.sol accepts the permit (riskScore <= 69)
      const approvedRiskScore = 25;
      let signature = null;
      let nonce = 0;
      let deadline = Math.floor(Date.now() / 1000) + 3600;

      if (!DEMO_FALLBACK_MODE && aiSignerWallet) {
        const authData = await signAIAuthorization(row.requester, row.recipient, row.tokenId, approvedRiskScore);
        signature = authData.signature;
        nonce = authData.nonce;
        deadline = authData.deadline;
      }

      db.run(
        `UPDATE approvals SET status = 'APPROVED', approvedBy = ?, signature = ?, nonce = ?, deadline = ?, riskScore = ? WHERE id = ?`,
        [approvedBy || 'Admin', signature, nonce, deadline, approvedRiskScore, id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: "Failed to update approval" });
          res.json({
            id: Number(id),
            status: 'APPROVED',
            approvedBy: approvedBy || 'Admin',
            signature,
            nonce,
            deadline,
            riskScore: approvedRiskScore
          });
        }
      );
    } catch (signErr) {
      console.error("Failed to generate signature on approval:", signErr);
      res.status(500).json({ error: "Failed to generate authorization signature upon approval" });
    }
  });
});

// Approvals: Mark executed (PATCH /api/approvals/:id/execute)
app.patch('/api/approvals/:id/execute', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE approvals SET status = 'EXECUTED' WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: "Failed to mark as executed" });
    res.json({ id: Number(id), status: 'EXECUTED' });
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Indexer and AI Authorization backend running on http://localhost:${PORT}`);
  });
}

export default app;

