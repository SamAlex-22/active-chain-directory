import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";

interface AuditLog {
  id: number;
  action: string;
  actor: string;
  assetId: number;
  details: string;
  timestamp: number;
  txHash: string;
}

interface ServiceStatus {
  blockchain: "Operational" | "Offline" | "Checking";
  identity: "Operational" | "Offline" | "Checking";
  aiEngine: "Connected" | "Offline" | "Checking";
  siem: "Connected" | "Offline" | "Checking";
}

interface DashboardOverviewProps {
  onNavigate: (section: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const { provider, roleManager, identityRegistry, account, currentRole } = useWeb3();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [status, setStatus] = useState<ServiceStatus>({
    blockchain: "Checking",
    identity: "Checking",
    aiEngine: "Checking",
    siem: "Checking",
  });

  // ── 1. Check Live Service Health ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      // Blockchain check
      let bcStatus: "Operational" | "Offline" = "Offline";
      try {
        if (provider) {
          const block = await provider.getBlockNumber();
          if (block !== undefined) bcStatus = "Operational";
        }
      } catch {
        bcStatus = "Offline";
      }

      // Identity Contract check
      let idStatus: "Operational" | "Offline" = "Offline";
      try {
        if (identityRegistry && roleManager) {
          idStatus = "Operational";
        }
      } catch {
        idStatus = "Offline";
      }

      // AI Risk Engine check (GET http://127.0.0.1:8000/health)
      let aiStatus: "Connected" | "Offline" = "Offline";
      try {
        const res = await fetch("http://127.0.0.1:8000/health", {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok") aiStatus = "Connected";
        }
      } catch {
        aiStatus = "Offline";
      }

      // SIEM Indexer check (GET http://127.0.0.1:3001/health)
      let siemStatus: "Connected" | "Offline" = "Offline";
      try {
        const res = await fetch("http://127.0.0.1:3001/health", {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok") siemStatus = "Connected";
        }
      } catch {
        siemStatus = "Offline";
      }

      if (isMounted) {
        setStatus({
          blockchain: bcStatus,
          identity: idStatus,
          aiEngine: aiStatus,
          siem: siemStatus,
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [provider, identityRegistry, roleManager]);

  // ── 2. Fetch Recent Events from SIEM ─────────────────────────────
  const fetchRecentLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const response = await fetch("http://127.0.0.1:3001/api/logs", {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("SIEM indexer returned error");
      const data: AuditLog[] = await response.json();
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SIEM service unavailable";
      setLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  // ── Metric Calculations from Verified Sources ───────────────────
  const totalEvents = logs.length;
  const activeAssets = new Set(logs.filter((l) => l.assetId !== 0).map((l) => l.assetId)).size;
  const recentTransfers = logs.filter((l) => l.action === "ASSET_TRANSFERRED").length;

  const truncate = (val: string) => {
    if (!val || val.length <= 12) return val;
    return `${val.slice(0, 6)}…${val.slice(-4)}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* ── Top Hero / Overview Header ─────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/80" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Zero-Trust Directory</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Security Operations Center (SOC)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Decentralized identity governance, attribute-based access control, and digital twin ledger telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecentLogs}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:border-white/25 hover:bg-white/10 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* ── Security Status Area (Requirement 8) ───────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
          </svg>
          System Security & Network Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Blockchain */}
          <div className="rounded-lg border border-white/5 bg-black/30 p-3.5">
            <div className="text-[11px] text-gray-400 font-medium">EVM Blockchain</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.blockchain === "Operational" ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/80" : "bg-red-400"}`} />
              <span className="text-sm font-semibold text-white">{status.blockchain}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Chain ID: 31337</div>
          </div>

          {/* Identity */}
          <div className="rounded-lg border border-white/5 bg-black/30 p-3.5">
            <div className="text-[11px] text-gray-400 font-medium">Identity Registry</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.identity === "Operational" ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/80" : "bg-red-400"}`} />
              <span className="text-sm font-semibold text-white">{status.identity}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">No PII / DIDs Only</div>
          </div>

          {/* AI Risk Engine */}
          <div className="rounded-lg border border-white/5 bg-black/30 p-3.5">
            <div className="text-[11px] text-gray-400 font-medium">AI Risk Engine</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.aiEngine === "Connected" ? "bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400/80" : "bg-amber-400"}`} />
              <span className="text-sm font-semibold text-white">{status.aiEngine}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">FastAPI :8000</div>
          </div>

          {/* SIEM Indexer */}
          <div className="rounded-lg border border-white/5 bg-black/30 p-3.5">
            <div className="text-[11px] text-gray-400 font-medium">SIEM Event Indexer</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.siem === "Connected" ? "bg-indigo-400 shadow-[0_0_6px] shadow-indigo-400/80" : "bg-amber-400"}`} />
              <span className="text-sm font-semibold text-white">{status.siem}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Node SQLite :3001</div>
          </div>
        </div>
      </div>

      {/* ── High-Level Metric Cards (Requirement 7) ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Blockchain Events */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Blockchain Events</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white">
              {logsLoading ? "…" : totalEvents}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Logged</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Immutable records in AuditRegistry</p>
        </div>

        {/* Card 2: Digital Twins Active */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Digital Twins</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-cyan-400">
              {logsLoading ? "…" : activeAssets}
            </span>
            <span className="text-xs text-cyan-300 font-medium">Anchored</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Physical IoT assets mapped on-chain</p>
        </div>

        {/* Card 3: Asset Transfers */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asset Transfers</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-purple-400">
              {logsLoading ? "…" : recentTransfers}
            </span>
            <span className="text-xs text-purple-300 font-medium">Audited</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Evaluated by ABAC Risk Engine</p>
        </div>

        {/* Card 4: Governance Role Session */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Clearance</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-indigo-300">
              {currentRole}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 font-mono truncate">{truncate(account || "No account")}</p>
        </div>
      </div>

      {/* ── Quick Launchpad Workspaces ─────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Enterprise Consoles</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => onNavigate("directory")}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-purple-500/50 hover:bg-purple-950/20 transition-all group"
          >
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-purple-300">🏢 Directory IAM</div>
              <div className="text-xs text-gray-500 mt-0.5">Onboard identities & assign roles</div>
            </div>
            <span className="text-gray-500 group-hover:text-purple-400">→</span>
          </button>

          <button
            onClick={() => onNavigate("transfer")}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all group"
          >
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300">⚡ Zero-Trust Transfer</div>
              <div className="text-xs text-gray-500 mt-0.5">Contextual AI-protected transfer portal</div>
            </div>
            <span className="text-gray-500 group-hover:text-cyan-400">→</span>
          </button>

          <button
            onClick={() => onNavigate("siem")}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all group"
          >
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-emerald-300">📊 SIEM Operations</div>
              <div className="text-xs text-gray-500 mt-0.5">Real-time immutable security logs</div>
            </div>
            <span className="text-gray-500 group-hover:text-emerald-400">→</span>
          </button>
        </div>
      </div>

      {/* ── Recent Security Events (Requirement 10) ────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.01] px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Security & Blockchain Events</h3>
            <p className="text-xs text-gray-400">Live indexed records from SIEM SQLite service</p>
          </div>
          <button
            onClick={() => onNavigate("siem")}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View All in SIEM Console →
          </button>
        </div>

        {logsLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400 mr-2" />
            Connecting to SIEM Indexer…
          </div>
        ) : logsError ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-amber-400/80 font-medium">SIEM Indexer Unavailable</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Ensure the backend indexer is running at <code>http://127.0.0.1:3001</code>.
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No events indexed yet. Deploy contracts or initiate an asset transfer to generate events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Asset ID</th>
                  <th className="px-5 py-3">Details / IoT Tag</th>
                  <th className="px-5 py-3">TX Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {logs.slice(0, 6).map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-gray-400">
                      {new Date(log.timestamp * 1000).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          log.action === "ASSET_MINTED"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : log.action === "ASSET_TRANSFERRED"
                            ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-300">
                      {truncate(log.actor)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-cyan-400 font-bold">
                      {log.assetId === 0 ? "—" : `#${log.assetId}`}
                    </td>
                    <td className="px-5 py-3 text-gray-400 max-w-xs truncate font-sans text-xs">
                      {log.details || "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                      {truncate(log.txHash)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
