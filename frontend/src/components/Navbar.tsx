import { useWeb3 } from "../context/Web3Context";
import { useState } from "react";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  MANAGER: "bg-blue-600/20 text-blue-300 border-blue-500/40",
  AUDITOR: "bg-amber-600/20 text-amber-300 border-amber-500/40",
  USER: "bg-slate-600/20 text-slate-300 border-slate-500/40",
  NONE: "bg-gray-700/20 text-gray-400 border-gray-600/40",
};

export default function Navbar() {
  const { account, chainId, isCorrectNetwork, currentRole, connectionMode, connectWallet, connectLocal, switchNetwork } = useWeb3();
  const [copied, setCopied] = useState(false);

  const truncatedAddress = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : "";

  const copyAddress = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Active Chain Directory
          </span>
        </div>

        {/* ── Right controls ────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Connection mode pill */}
          {account && connectionMode && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-400">
              {connectionMode === "local" ? "⚡ Local RPC" : "🦊 MetaMask"}
            </span>
          )}

          {/* Network pill */}
          {account && (
            <button
              onClick={!isCorrectNetwork ? switchNetwork : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isCorrectNetwork
                  ? "border-emerald-500/40 bg-emerald-600/15 text-emerald-400"
                  : "cursor-pointer border-red-500/40 bg-red-600/15 text-red-400 hover:bg-red-600/25"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${isCorrectNetwork ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" : "bg-red-400 animate-pulse"}`} />
              {isCorrectNetwork ? `Localhost:8545 (${chainId})` : `Wrong Network (${chainId})`}
            </button>
          )}

          {/* Role badge */}
          {account && (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${ROLE_STYLES[currentRole]}`}>
              {currentRole}
            </span>
          )}

          {/* Connect / Address button */}
          {!account ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => connectLocal(0)}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-95"
              >
                Connect Local Node
              </button>
              <button
                onClick={connectWallet}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-white/25 hover:bg-white/10 active:scale-95"
              >
                MetaMask
              </button>
            </div>
          ) : (
            <button
              onClick={copyAddress}
              className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
              {truncatedAddress}
              <span className="text-xs text-gray-500 transition-colors group-hover:text-gray-300">
                {copied ? "✓" : "⎘"}
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
