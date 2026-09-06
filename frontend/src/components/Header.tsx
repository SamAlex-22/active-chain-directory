import { useState, useEffect } from "react";
import { useWeb3, DEMO_PERSONAS } from "../context/Web3Context";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  MANAGER: "bg-blue-600/20 text-blue-300 border-blue-500/40",
  AUDITOR: "bg-amber-600/20 text-amber-300 border-amber-500/40",
  USER: "bg-slate-600/20 text-slate-300 border-slate-500/40",
  NONE: "bg-gray-700/20 text-gray-400 border-gray-600/40",
};

interface HeaderProps {
  currentSectionTitle: string;
  onToggleSidebar: () => void;
}

export default function Header({ currentSectionTitle, onToggleSidebar }: HeaderProps) {
  const {
    account,
    chainId,
    isCorrectNetwork,
    currentRole,
    connectionMode,
    activePersonaIndex,
    connectWallet,
    connectLocal,
    switchPersona,
    switchNetwork,
  } = useWeb3();

  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [securityMode, setSecurityMode] = useState<"SECURE" | "DEMO_FALLBACK">("SECURE");

  useEffect(() => {
    fetch("http://127.0.0.1:3001/api/security/mode")
      .then((res) => res.json())
      .then((data) => {
        if (data?.mode) setSecurityMode(data.mode);
      })
      .catch(() => {});
  }, []);

  const truncatedAddress = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : "";

  const copyAddress = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePersonaChange = async (index: number) => {
    setSwitching(true);
    try {
      await switchPersona(index);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-gray-950/80 px-4 backdrop-blur-xl sm:px-6">
      {/* ── Left: Breadcrumb & Workspace Title ──────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 hidden sm:inline">ACD /</span>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {currentSectionTitle}
          </h2>
        </div>
      </div>

      {/* ── Right: Persona Switcher, Role, Network, Wallet ──────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Persona Switcher (Section 5) */}
        {account && connectionMode === "local" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hidden md:inline">
              Persona:
            </span>
            <select
              value={activePersonaIndex}
              disabled={switching}
              onChange={(e) => handlePersonaChange(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
            >
              {DEMO_PERSONAS.map((p) => (
                <option key={p.index} value={p.index} className="bg-gray-900 text-white py-1">
                  {p.icon} {p.label} (Acc #{p.index})
                </option>
              ))}
            </select>
            {switching && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            )}
          </div>
        )}

        {/* Security Mode Indicator (M3) */}
        {securityMode === "SECURE" ? (
          <div
            title="EIP-712 AI Validator Active"
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" />
            <span>🛡️ AI: SECURE</span>
          </div>
        ) : (
          <div
            title="Cryptographic AI authorization unavailable"
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-[11px] font-semibold text-amber-300"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>⚠️ AI: DEMO FALLBACK</span>
          </div>
        )}

        {/* Network Pill */}
        {account && (
          <button
            onClick={!isCorrectNetwork ? switchNetwork : undefined}
            className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              isCorrectNetwork
                ? "border-emerald-500/40 bg-emerald-600/15 text-emerald-400"
                : "cursor-pointer border-red-500/40 bg-red-600/15 text-red-400 hover:bg-red-600/25"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isCorrectNetwork
                  ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60"
                  : "bg-red-400 animate-pulse"
              }`}
            />
            {isCorrectNetwork ? `Hardhat Local (${chainId})` : `Wrong Network (${chainId})`}
          </button>
        )}

        {/* Role Badge */}
        {account && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
              ROLE_STYLES[currentRole] || ROLE_STYLES.NONE
            }`}
          >
            {currentRole}
          </span>
        )}

        {/* Connect / Address Button */}
        {!account ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => connectLocal(0)}
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:brightness-110"
            >
              ⚡ Local Node
            </button>
            <button
              onClick={connectWallet}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10"
            >
              🦊 MetaMask
            </button>
          </div>
        ) : (
          <button
            onClick={copyAddress}
            title="Click to copy address"
            className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
            <span>{truncatedAddress}</span>
            <span className="text-[10px] text-gray-500 transition-colors group-hover:text-gray-300">
              {copied ? "✓" : "⎘"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
