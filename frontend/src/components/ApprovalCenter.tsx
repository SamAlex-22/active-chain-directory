import { useState, useEffect } from "react";
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
interface ApprovalRecord {
  id: number;
  requester: string;
  recipient: string;
  tokenId: number;
  riskScore: number;
  riskLevel: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  createdAt: number;
  approvedBy?: string;
  signature?: string;
  nonce?: number;
  deadline?: number;
}

// ── Main Component ─────────────────────────────────────────────────
export default function ApprovalCenter() {
  const { account, currentRole, assetNFT } = useWeb3();

  const [requests, setRequests] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch approvals from SQLite backend
  const fetchApprovals = async () => {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 4000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = currentRole === "ADMIN";

  // ── Handlers ─────────────────────────────────────────────────────
  const handleReject = async (id: number) => {
    if (!isAdmin) {
      showToast("Access Denied: Only ADMIN may reject requests.", "error");
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", approvedBy: account }),
      });
      if (res.ok) {
        showToast(`Request #${id} rejected.`, "success");
        await fetchApprovals();
      } else {
        throw new Error("Failed to reject request");
      }
    } catch (err) {
      showToast("Error updating request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (req: ApprovalRecord) => {
    if (!isAdmin) {
      showToast("Access Denied: Only ADMIN may approve requests.", "error");
      return;
    }
    setProcessingId(req.id);
    try {
      // Backend validates admin approval and issues cryptographic EIP-712 signature
      const res = await fetch(`http://127.0.0.1:3001/api/approvals/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", approvedBy: account }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to approve request");
      }

      showToast(`Request #${req.id} APPROVED. Cryptographic permit generated!`, "success");
      await fetchApprovals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Approval failed";
      showToast(message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecuteApprovedTransfer = async (req: ApprovalRecord) => {
    if (!assetNFT || !req.signature || !req.deadline) {
      showToast("Missing cryptographic authorization signature or deadline", "error");
      return;
    }
    setExecutingId(req.id);
    try {
      // Execute the real on-chain transfer using the cryptographic EIP-712 permit
      const tx = await assetNFT.transferWithAIPermit(
        req.requester,
        req.recipient,
        BigInt(req.tokenId),
        BigInt(req.riskScore),
        BigInt(req.deadline),
        req.signature
      );
      const receipt = await tx.wait();

      // Mark request as executed in backend SQLite database
      await fetch(`http://127.0.0.1:3001/api/approvals/${req.id}/execute`, {
        method: "PATCH",
      });

      showToast(`On-Chain Settlement Confirmed! TX: ${receipt?.hash?.slice(0, 10)}…`, "success");
      await fetchApprovals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution failed";
      if (message.includes("InvalidAISignature")) {
        showToast("Execution Reverted: AI authorization signature rejected by contract.", "error");
      } else if (message.includes("AuthorizationExpired")) {
        showToast("Execution Reverted: AI permit has expired.", "error");
      } else if (message.includes("DirectTransferNotAllowed")) {
        showToast("Execution Reverted: Direct contract bypass blocked.", "error");
      } else {
        const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
        showToast(shortMsg, "error");
      }
    } finally {
      setExecutingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-white/10 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
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

          {!isAdmin ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              <span>🔒</span>
              <span><strong>READ ONLY:</strong> Requires ADMIN_ROLE to approve</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-300">
              <span>🛡️</span>
              <span><strong>ADMIN CONSOLE:</strong> Full Authorization Authority</span>
            </div>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-400">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400 mr-2" />
            Loading persistent approval tickets…
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-sm text-gray-500 shadow-inner">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-xl text-emerald-400">✓</span>
            </div>
            All caught up! No pending high-risk requests in the database.
          </div>
        ) : (
          requests.map((req) => {
            const isPending = req.status === "PENDING";
            const isApproved = req.status === "APPROVED";
            const isExecuted = req.status === "EXECUTED";
            const isRejected = req.status === "REJECTED";

            return (
              <div
                key={req.id}
                className={`overflow-hidden rounded-xl border shadow-xl transition-all ${
                  isPending
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-transparent"
                    : isApproved
                    ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-transparent"
                    : isExecuted
                    ? "border-indigo-500/30 bg-indigo-950/10 opacity-80"
                    : "border-red-500/30 bg-red-950/10 opacity-75"
                }`}
              >
                <div className="flex flex-col border-b border-white/5 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      #APR-{String(req.id).padStart(4, "0")}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : isApproved
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : isExecuted
                          ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                          : "border-red-500/40 bg-red-500/15 text-red-300"
                      }`}
                    >
                      {isPending
                        ? "● PENDING ADMIN APPROVAL"
                        : isApproved
                        ? "✓ APPROVED (AI PERMIT SIGNED)"
                        : isExecuted
                        ? "✓ EXECUTED ON-CHAIN"
                        : "✗ REJECTED"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 sm:mt-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Risk Score</span>
                    <span
                      className={`flex items-center justify-center rounded-md border px-3 py-1 font-mono text-xl font-bold ${
                        req.riskScore >= 70
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
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
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Submission Timestamp</dt>
                        <dd className="mt-1 text-xs text-gray-400">{new Date(req.createdAt).toLocaleString()}</dd>
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
                      {req.approvedBy && (
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Reviewed By</dt>
                          <dd className="mt-1 break-all font-mono text-xs text-emerald-400">{req.approvedBy}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={!isAdmin || processingId !== null}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={!isAdmin || processingId !== null}
                          className="flex min-w-[200px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {processingId === req.id ? (
                            <>
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Generating AI Permit…
                            </>
                          ) : (
                            "Approve & Sign Permit"
                          )}
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => handleExecuteApprovedTransfer(req)}
                        disabled={executingId !== null}
                        className="flex min-w-[240px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {executingId === req.id ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Executing On-Chain Settlement…
                          </>
                        ) : (
                          "⚡ Execute Approved Transfer On-Chain"
                        )}
                      </button>
                    )}

                    {isExecuted && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span>✓</span> Successfully settled on-chain with cryptographic AI permit.
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                        <span>✗</span> Rejected by governance administrator.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
