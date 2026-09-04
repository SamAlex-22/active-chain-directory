import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";

// ── Types ──────────────────────────────────────────────────────────
interface AuditLog {
  id: number;
  action: string;
  actor: string;
  assetId: number;
  details: string;
  timestamp: number;
  txHash: string;
}

// ── Helpers ────────────────────────────────────────────────────────
const truncateHash = (str: string) => {
  if (!str || str.length <= 10) return str;
  return `${str.slice(0, 6)}…${str.slice(-4)}`;
};

const getActionBadge = (action: string) => {
  switch (action) {
    case "ASSET_MINTED":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    case "ASSET_TRANSFERRED":
      return "border-purple-500/30 bg-purple-500/10 text-purple-400";
    case "METADATA_UPDATED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
  }
};

// ── Main Component ─────────────────────────────────────────────────
export default function AuditDashboard() {
  const { currentRole } = useWeb3();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("http://127.0.0.1:3001/api/logs");
      if (!response.ok) throw new Error("Failed to connect to SIEM backend");
      const data = await response.json();
      setLogs(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentRole === "ADMIN" || currentRole === "AUDITOR") {
      fetchLogs();
    }
  }, [currentRole, fetchLogs]);

  // ── Access Control Gate ──────────────────────────────────────────
  if (currentRole !== "ADMIN" && currentRole !== "AUDITOR") {
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
            The SIEM console is strictly classified. Only <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">AUDITOR_ROLE</code> or <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">ADMIN_ROLE</code> clearants may view this module.
          </p>
        </div>
      </div>
    );
  }

  // Calculate mock & derived stats
  const totalEvents = logs.length;
  // Deduplicate active assets by looking for unique assetIds > 0
  const activeAssets = new Set(logs.filter((l) => l.assetId !== 0).map((l) => l.assetId)).size;
  // Mocked AI intervention number for demonstration
  const aiInterventions = 12;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Security & Event SIEM
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Immutable Audit Trail of on-chain operations synced via Node.js Indexer.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-lg bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 border border-indigo-500/30 transition-all hover:bg-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          {loading ? "Syncing..." : "Refresh Logs"}
        </button>
      </div>

      {/* Security Overview Widgets */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-black/40 p-5 shadow-lg">
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Events Logged</dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{totalEvents}</span>
            <span className="text-sm font-medium text-emerald-400">On-Chain</span>
          </dd>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/40 p-5 shadow-lg">
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Assets</dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{activeAssets}</span>
            <span className="text-sm font-medium text-blue-400">Tracked</span>
          </dd>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-black/40 p-5 shadow-lg">
          <dt className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">AI Interventions</dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-400">{aiInterventions}</span>
            <span className="text-sm font-medium text-amber-500/60">Blocked/Halted</span>
          </dd>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          <span className="mr-2">✗</span>
          {errorMsg}
        </div>
      )}

      {/* Immutable Log Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-4">Timestamp</th>
                <th scope="col" className="px-6 py-4">Action</th>
                <th scope="col" className="px-6 py-4">Actor</th>
                <th scope="col" className="px-6 py-4">Asset ID</th>
                <th scope="col" className="px-6 py-4">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 && !loading && !errorMsg ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No audit logs found. Waiting for on-chain events...
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-6 py-4 text-xs font-medium text-gray-400">
                      {new Date(log.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-gray-300 border border-white/10">
                        {truncateHash(log.actor)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-300">
                      {log.assetId === 0 ? "—" : `#${log.assetId}`}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {log.txHash === "Unknown" ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        <a 
                          href="#"
                          className="flex items-center gap-1 font-mono text-xs text-indigo-400 hover:text-indigo-300"
                          title={log.txHash}
                          onClick={(e) => e.preventDefault()}
                        >
                          {truncateHash(log.txHash)}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
