import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";

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

// ── Types ──────────────────────────────────────────────────────────
interface FlaggedRequest {
  id: number;
  requester: string;
  tokenId: number;
  recipient: string;
  riskScore: number;
  reason: string;
}

// ── Mock Data ──────────────────────────────────────────────────────
const MOCK_REQUESTS: FlaggedRequest[] = [
  {
    id: 1,
    requester: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    tokenId: 1,
    recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    riskScore: 87,
    reason: "Off-hours transfer + Unknown Device",
  },
  {
    id: 2,
    requester: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    tokenId: 3,
    recipient: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    riskScore: 75,
    reason: "High asset sensitivity + Multiple recent transfers",
  },
];

// ── Main Component ─────────────────────────────────────────────────
export default function ApprovalCenter() {
  const { currentRole, assetNFT } = useWeb3();

  const [requests, setRequests] = useState<FlaggedRequest[]>(MOCK_REQUESTS);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Access Control Gate ──────────────────────────────────────────
  if (currentRole !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-red-300">Access Denied</h2>
          <p className="text-sm text-red-400/70">
            The Governance Approval Center is strictly restricted to accounts holding the <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">ADMIN_ROLE</code>. Your current role is <strong>{currentRole}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────
  const handleReject = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    showToast(`Request #${id} securely rejected.`, "success");
  };

  const handleApprove = async (req: FlaggedRequest) => {
    if (!assetNFT) return;
    setProcessingId(req.id);
    try {
      // Execute the transfer manually on behalf of the requester.
      // Note: In standard ERC721, this requires the requester to have approved the Admin.
      const tx = await assetNFT.transferFrom(req.requester, req.recipient, BigInt(req.tokenId));
      const receipt = await tx.wait();
      
      showToast(`Admin Override Successful! TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Approval failed";
      // Handle standard ERC-721 transfer errors gracefully in UI
      if (message.includes("ERC721") || message.includes("revert")) {
        showToast("Contract reverted. Did the requester grant approval to the Admin?", "error");
      } else {
        const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
        showToast(shortMsg, "error");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-white/10 pb-5">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Approval Center
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Governance console for reviewing and authorizing transactions flagged by the AI Risk Engine.
        </p>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500 shadow-inner">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-xl text-emerald-400">✓</span>
            </div>
            All caught up! No pending high-risk requests.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-transparent shadow-xl">
              <div className="flex flex-col border-b border-white/5 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Transfer Request #{req.id}</h3>
                  <p className="text-xs text-gray-400">Requires multi-party governance override</p>
                </div>
                <div className="mt-4 flex items-center gap-2 sm:mt-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500/80">AI Risk Score</span>
                  <span className="flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xl font-bold text-amber-400 shadow-[0_0_15px] shadow-amber-500/20">
                    {req.riskScore}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6 grid gap-6 sm:grid-cols-2">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Asset to Transfer</dt>
                      <dd className="mt-1 font-mono text-sm font-medium text-indigo-400">Token ID #{req.tokenId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Flag Reason</dt>
                      <dd className="mt-1 text-sm font-medium text-amber-300">{req.reason}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-4 rounded-lg border border-white/5 bg-black/20 p-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Requester (From)</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-gray-300">{req.requester}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Recipient (To)</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-gray-300">{req.recipient}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId !== null}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={processingId !== null}
                    className="flex min-w-[200px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {processingId === req.id ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Executing...
                      </>
                    ) : (
                      "Approve & Execute"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
