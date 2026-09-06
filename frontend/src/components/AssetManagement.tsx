import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import RiskMeter from "./RiskMeter";
import ThreatSimulator, { type SimulationTelemetry } from "./ThreatSimulator";

// ── Toast component ────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-2xl backdrop-blur-xl transition-all animate-[slideUp_0.3s_ease-out] ${
      type === "success"
        ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-300"
        : "border-red-500/30 bg-red-950/90 text-red-300"
    }`}>
      <span className="text-sm">{type === "success" ? "✓" : "✗"}</span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-xs opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

// ── Lookup result type ─────────────────────────────────────────────
interface AssetData {
  tokenId: string;
  owner: string;
  tokenURI: string;
  iotTagId: string;
}

interface AssetManagementProps {
  mode?: "all" | "vault" | "transfer";
}

// ── Main Component ─────────────────────────────────────────────────
export default function AssetManagement({ mode = "all" }: AssetManagementProps) {
  const { account, currentRole, assetNFT } = useWeb3();

  // Mint Asset state
  const [mintRecipient, setMintRecipient] = useState("");
  const [mintTokenUri, setMintTokenUri] = useState("");
  const [mintIotTag, setMintIotTag] = useState("");
  const [mintLoading, setMintLoading] = useState(false);

  // Transfer Asset state
  const [transferTokenId, setTransferTokenId] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  
  // AI Risk Engine state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiDecision, setAiDecision] = useState<{ score: number; level: string; decision: string; factors?: Record<string, number> } | null>(null);
  const [amberWarning, setAmberWarning] = useState<string | null>(null);
  const [pendingApprovalTicket, setPendingApprovalTicket] = useState<{
    requestId: string;
    score: number;
    level: string;
    decision: string;
    status: string;
  } | null>(null);

  // Threat Simulation Mode state (Requirements 1, 6 & 7)
  const [showSimulatorPanel, setShowSimulatorPanel] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simTelemetry, setSimTelemetry] = useState<SimulationTelemetry | null>(null);

  // Asset Lookup state
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [assetData, setAssetData] = useState<AssetData | null>(null);

  // Admin Emergency Override state
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Access Control Gate ──────────────────────────────────────────
  if (currentRole !== "ADMIN" && currentRole !== "MANAGER") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-red-300">Access Denied</h2>
          <p className="text-sm text-red-400/70">
            This module is restricted to accounts holding the <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">MANAGER_ROLE</code> or <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">ADMIN_ROLE</code>. Your current role is <strong>{currentRole}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Admin Emergency Override Handler (M4 Requirement 9) ─────────
  const handleAdminEmergencyOverride = async () => {
    if (!assetNFT || !account || !transferTokenId || !transferRecipient) {
      showToast("Please provide Token ID and Recipient Address first.", "error");
      return;
    }
    if (currentRole !== "ADMIN") {
      showToast("Access Denied: Emergency override strictly restricted to ADMIN_ROLE.", "error");
      return;
    }
    setEmergencyLoading(true);
    try {
      // In AssetNFT.sol, _update allows direct transfer only if msg.sender holds ADMIN_ROLE
      const tx = await assetNFT.transferFrom(account, transferRecipient, BigInt(transferTokenId));
      const receipt = await tx.wait();
      showToast(`⚠️ ADMIN EMERGENCY OVERRIDE: Executed directly via smart-contract ADMIN_ROLE privileges. Bypasses AI scoring. TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      setTransferTokenId("");
      setTransferRecipient("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Emergency transfer failed";
      showToast(message.slice(0, 90), "error");
    } finally {
      setEmergencyLoading(false);
    }
  };

  // ── Minting Handler ──────────────────────────────────────────────
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNFT || !mintRecipient) return;
    setMintLoading(true);
    try {
      const tx = await assetNFT.mintAsset(mintRecipient, mintTokenUri, mintIotTag);
      const receipt = await tx.wait();
      showToast(`Asset Minted! TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      setMintRecipient("");
      setMintTokenUri("");
      setMintIotTag("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
      showToast(shortMsg, "error");
    } finally {
      setMintLoading(false);
    }
  };

  // ── Transfer & AI Handler ────────────────────────────────────────
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNFT || !account || !transferTokenId || !transferRecipient) return;

    setAmberWarning(null);
    setPendingApprovalTicket(null);
    setAiDecision(null);
    setAiAnalyzing(true);
    setTransferLoading(false);

    try {
      // 1. Prepare ABAC Context payload: use simulated telemetry if active
      const role_level = currentRole === "ADMIN" ? 4 : currentRole === "MANAGER" ? 3 : 1;
      const payload = (simulationActive && simTelemetry)
        ? {
            role_level: simTelemetry.role_level,
            asset_sensitivity: simTelemetry.asset_sensitivity,
            hour_of_day: simTelemetry.hour_of_day,
            is_known_device: simTelemetry.is_known_device,
            recent_transfers_count: simTelemetry.recent_transfers_count,
            failed_login_attempts: simTelemetry.failed_login_attempts,
          }
        : {
            role_level,
            asset_sensitivity: 8,
            hour_of_day: new Date().getHours(),
            is_known_device: 1,
            recent_transfers_count: 0,
            failed_login_attempts: 0,
          };

      // 2. Fetch AI Risk Evaluation from existing FastAPI /evaluate with offline protection
      let response;
      try {
        response = await fetch("http://127.0.0.1:8000/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (netErr) {
        setAiAnalyzing(false);
        showToast("AI Risk Engine is offline at http://127.0.0.1:8000. Transaction safely halted.", "error");
        return;
      }
      
      if (!response.ok) {
        setAiAnalyzing(false);
        showToast("AI Risk Engine returned an error. Transaction safely halted.", "error");
        return;
      }
      const riskData = await response.json();
      
      setAiDecision({
        score: riskData.risk_score,
        level: riskData.risk_level,
        decision: riskData.decision,
        factors: riskData.factors,
      });
      
      setAiAnalyzing(false);

      // 3. Enforce AI Decision: Critical Block
      if (riskData.decision === "BLOCK + ALERT") {
        showToast("Transaction Blocked by AI Risk Engine. Critical risk detected.", "error");
        return; // Halt transaction
      }
      
      // Enforce AI Decision: High Risk Requires Approval
      if (riskData.decision === "REQUIRE_APPROVAL") {
        setAmberWarning(`AI Risk Score: ${riskData.risk_score} (HIGH). Multi-party governance approval required.`);
        
        // Save real approval request to SQLite database
        try {
          const appRes = await fetch("http://127.0.0.1:3001/api/approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requester: account,
              recipient: transferRecipient,
              tokenId: Number(transferTokenId),
              riskScore: riskData.risk_score,
              riskLevel: riskData.risk_level,
              reason: "High risk score flagged by AI Risk Engine",
            }),
          });
          if (appRes.ok) {
            const appData = await appRes.json();
            setPendingApprovalTicket({
              requestId: appData.requestId || `#APR-${String(appData.id).padStart(4, '0')}`,
              score: riskData.risk_score,
              level: riskData.risk_level,
              decision: riskData.decision,
              status: "● PENDING ADMIN APPROVAL",
            });
            showToast(`Approval Request ${appData.requestId} filed with Governance Center.`, "success");
          }
        } catch (postErr) {
          console.error("Failed to post approval request:", postErr);
        }
        return; // Halt transaction
      }

      // 4. Proceed to Blockchain (ALLOW or ALLOW + AUDIT)
      setTransferLoading(true);

      // Query Security Mode
      let mode = "SECURE";
      try {
        const modeRes = await fetch("http://127.0.0.1:3001/api/security/mode");
        if (modeRes.ok) {
          const modeData = await modeRes.json();
          mode = modeData.mode || "SECURE";
        }
      } catch {
        mode = "SECURE";
      }

      if (mode === "DEMO_FALLBACK") {
        showToast("⚠️ DEMO FALLBACK MODE: Direct transfer executed without cryptographic AI signature.", "error");
        const tx = await assetNFT.transferFrom(account, transferRecipient, BigInt(transferTokenId));
        const receipt = await tx.wait();
        showToast(`Demo Transfer Completed! TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      } else {
        // Secure Mode: Obtain server-side EIP-712 AI permit
        const signRes = await fetch("http://127.0.0.1:3001/api/authorizations/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: account,
            to: transferRecipient,
            tokenId: Number(transferTokenId),
            riskScore: riskData.risk_score,
          }),
        });

        if (!signRes.ok) {
          const errBody = await signRes.json().catch(() => ({}));
          throw new Error(errBody.error || "AI authorization signing service unavailable");
        }

        const authData = await signRes.json();

        // Submit cryptographic permit to smart contract
        const tx = await assetNFT.transferWithAIPermit(
          account,
          transferRecipient,
          BigInt(transferTokenId),
          BigInt(authData.riskScore),
          BigInt(authData.deadline),
          authData.signature
        );
        const receipt = await tx.wait();
        showToast(`Asset Transferred with AI Cryptographic Permit! TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      }
      
      setTransferTokenId("");
      setTransferRecipient("");

    } catch (err: unknown) {
      setAiAnalyzing(false);
      const message = err instanceof Error ? err.message : "Transfer failed";
      if (message.includes("DirectTransferNotAllowed")) {
        showToast("TRANSFER BLOCKED: Direct contract calls without AI authorization permit are rejected.", "error");
      } else if (message.includes("InvalidAISignature")) {
        showToast("TRANSFER BLOCKED: AI authorization signature could not be verified by the smart contract.", "error");
      } else if (message.includes("AuthorizationExpired")) {
        showToast("TRANSFER BLOCKED: AI authorization permit deadline has expired.", "error");
      } else if (message.includes("RiskTooHigh")) {
        showToast("TRANSFER BLOCKED: Risk score exceeds threshold permitted on-chain.", "error");
      } else if (message.includes("ACTION_REJECTED") || message.includes("User denied")) {
        showToast("Transaction rejected by wallet.", "error");
      } else if (message.includes("ERC721") || message.includes("revert")) {
        showToast("Transfer reverted by smart contract. Ensure you own this token.", "error");
      } else {
        const shortMsg = message.length > 90 ? message.slice(0, 90) + "…" : message;
        showToast(shortMsg, "error");
      }
    } finally {
      setTransferLoading(false);
    }
  };

  // ── Asset Lookup Handler ─────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNFT || !lookupId) return;
    setLookupLoading(true);
    setAssetData(null);
    try {
      const tokenId = BigInt(lookupId);
      const owner = await assetNFT.ownerOf(tokenId);
      const tokenURI = await assetNFT.tokenURI(tokenId);
      const iotTagId = await assetNFT.iotTagIds(tokenId);

      setAssetData({
        tokenId: tokenId.toString(),
        owner,
        tokenURI,
        iotTagId: iotTagId || "—",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      if (message.includes("revert") || message.includes("ERC721")) {
        showToast("Token ID does not exist", "error");
      } else {
        showToast(message.slice(0, 80), "error");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const showVault = mode === "all" || mode === "vault";
  const showTransfer = mode === "all" || mode === "transfer";

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {mode === "vault" ? "Digital Twin Vault" : mode === "transfer" ? "Zero-Trust Asset Transfer" : "Asset Management"}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {mode === "vault"
            ? "Mint and verify physical IoT anchors tied to immutable ERC-721 digital twins."
            : mode === "transfer"
            ? "Initiate decentralized asset transfers protected by contextual AI risk scoring."
            : "Mint, transfer, and verify digital twin assets protected by AI."}
        </p>
      </div>

      {/* ── Section: Threat Simulation Mode Collapsible (Requirements 1, 6 & 7) ── */}
      {showTransfer && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setShowSimulatorPanel(!showSimulatorPanel)}
              className="flex items-center gap-2.5 text-left text-sm font-bold text-white hover:text-rose-300 transition-colors"
            >
              <span className="text-base">🧪</span>
              <span>Threat Simulation Mode</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 border border-rose-500/30">
                Interactive Attack Sandbox
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowSimulatorPanel(!showSimulatorPanel)}
              className="text-xs font-mono text-gray-400 hover:text-white px-2 py-1"
            >
              {showSimulatorPanel ? "Hide Controls ▲" : "Configure Threats ▼"}
            </button>
          </div>

          {showSimulatorPanel && (
            <div className="p-5 border-t border-white/10">
              <ThreatSimulator
                isSimulationActive={simulationActive}
                onToggleSimulationActive={setSimulationActive}
                onTelemetryChange={setSimTelemetry}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Section 1: Mint Asset (Visible in Vault or All) ─────── */}
        {showVault && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white">Mint New Digital Twin (NFT)</h2>
            </div>
            <form onSubmit={handleMint} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Recipient Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={mintRecipient}
                  onChange={(e) => setMintRecipient(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Metadata URI <span className="text-gray-600">(IPFS CID)</span></label>
                <input
                  type="text"
                  placeholder="ipfs://..."
                  value={mintTokenUri}
                  onChange={(e) => setMintTokenUri(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">IoT Tag ID <span className="text-gray-600">(Physical Hardware Anchor)</span></label>
                <input
                  type="text"
                  placeholder="RFID-TAG-10492"
                  value={mintIotTag}
                  onChange={(e) => setMintIotTag(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={mintLoading}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mintLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Minting Digital Twin…
                  </span>
                ) : (
                  "Mint Digital Twin"
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Section 2: Asset Lookup (Visible in Vault or All) ───── */}
        {showVault && (
          <div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 mb-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-white">Lookup Digital Twin</h2>
              </div>
              <form onSubmit={handleLookup} className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  placeholder="Token ID (e.g. 1)"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25"
                  required
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:border-white/25 hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lookupLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-400" />
                  ) : (
                    "Lookup"
                  )}
                </button>
              </form>
            </div>

            {/* Lookup Results - Digital Twin Card */}
            {assetData && (
              <div className="overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-900/20 to-transparent shadow-xl">
                <div className="border-b border-white/5 bg-white/[0.02] px-5 py-3">
                  <h3 className="text-sm font-bold text-cyan-400">Digital Twin Record</h3>
                </div>
                <div className="p-5">
                  <dl className="grid gap-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Token ID</dt>
                      <dd className="mt-0.5 text-lg font-mono text-white">#{assetData.tokenId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Current Owner</dt>
                      <dd className="mt-1 break-all rounded border border-white/10 bg-black/20 px-2.5 py-1.5 font-mono text-xs text-gray-300">
                        {assetData.owner}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Metadata URI</dt>
                      <dd className="mt-1 break-all rounded border border-white/10 bg-black/20 px-2.5 py-1.5 font-mono text-xs text-gray-300">
                        {assetData.tokenURI}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Physical Anchor (IoT Tag)</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400/60" />
                        <span className="font-mono text-sm text-gray-200">{assetData.iotTagId}</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Section 3: AI-Protected Transfer (Visible in Transfer or All) */}
        {showTransfer && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-6 shadow-xl lg:col-span-2">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-purple-100">AI-Guarded Transfer Portal</h2>
                  <p className="text-xs text-purple-300/70">Autonomous Contextual ABAC Risk Interception</p>
                </div>
              </div>

              {/* Simulation Mode Indicator Badge (Requirement 7) */}
              {simulationActive && (
                <div className="flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>SIMULATION TELEMETRY ACTIVE</span>
                </div>
              )}
            </div>
            
            <form onSubmit={handleTransfer} className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-purple-300">Token ID to Transfer</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={transferTokenId}
                  onChange={(e) => setTransferTokenId(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/20 bg-purple-950/30 px-3.5 py-2.5 font-mono text-sm text-purple-100 placeholder-purple-700 outline-none transition-colors focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-purple-300">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/20 bg-purple-950/30 px-3.5 py-2.5 font-mono text-sm text-purple-100 placeholder-purple-700 outline-none transition-colors focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30"
                  required
                />
              </div>
              <div className="sm:col-span-2 mt-2">
                <button
                  type="submit"
                  disabled={aiAnalyzing || transferLoading || emergencyLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {aiAnalyzing ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      AI Contextual Risk Evaluation in progress…
                    </>
                  ) : transferLoading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Executing On-Chain Settlement…
                    </>
                  ) : (
                    `Evaluate Risk & Execute Transfer ${simulationActive ? "(With Simulated Context)" : ""}`
                  )}
                </button>

                {/* Admin Emergency Override (M4 Requirement 9) */}
                {currentRole === "ADMIN" && (
                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2">
                    <div className="flex items-center gap-2 text-xs text-amber-300">
                      <span className="text-sm">⚠️</span>
                      <span><strong>Administrative Protocol:</strong> Direct smart-contract override reserved for ADMIN_ROLE.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdminEmergencyOverride}
                      disabled={emergencyLoading || transferLoading || aiAnalyzing}
                      className="rounded border border-amber-500/40 bg-amber-950/60 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-900/60 hover:text-amber-100 transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      {emergencyLoading ? (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
                          Executing Override…
                        </>
                      ) : (
                        "🚨 ADMIN EMERGENCY OVERRIDE"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* AI Decision UI with Reusable RiskMeter */}
            {aiDecision && (
              <div className="mt-6">
                <RiskMeter
                  score={aiDecision.score}
                  level={aiDecision.level}
                  decision={aiDecision.decision}
                  factors={aiDecision.factors}
                />
              </div>
            )}

            {/* Amber Warning Modal / Block */}
            {amberWarning && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/60 p-4 animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-lg">!</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">Transaction Halted by Policy</h4>
                    <p className="text-xs mt-1 text-amber-200/80">{amberWarning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Persistent Approval Request Ticket (Requirement 14) */}
            {pendingApprovalTicket && (
              <div className="mt-4 overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/50 via-amber-900/20 to-transparent p-5 shadow-2xl animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">⚠️</span>
                    <h4 className="text-sm font-bold tracking-wide text-amber-300 uppercase">Transfer Requires Governance Approval</h4>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-300">
                    {pendingApprovalTicket.requestId}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Risk Score</span>
                    <span className="font-mono text-base font-bold text-amber-400">{pendingApprovalTicket.score}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Risk Level</span>
                    <span className="font-bold text-amber-300">{pendingApprovalTicket.level}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Decision</span>
                    <span className="font-semibold text-amber-200">{pendingApprovalTicket.decision}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Status</span>
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      {pendingApprovalTicket.status}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-amber-200/80 border-t border-amber-500/15 pt-3">
                  A high-risk governance ticket has been stored in the persistent database. Switch persona to <strong>Admin</strong> and navigate to the <strong>Approval Center</strong> to inspect and grant cryptographic authorization.
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
