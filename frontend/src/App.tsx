import { useState } from "react";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardOverview from "./components/DashboardOverview";
import AdminDirectory from "./components/AdminDirectory";
import AssetManagement from "./components/AssetManagement";
import UserDashboard from "./components/UserDashboard";
import AuditDashboard from "./components/AuditDashboard";
import ApprovalCenter from "./components/ApprovalCenter";
import AttackSimulatorPlaceholder from "./components/AttackSimulatorPlaceholder";

function MainWorkspace() {
  const { account, chainId, isCorrectNetwork, currentRole, connectLocal, connectWallet } = useWeb3();
  const [currentSection, setCurrentSection] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const getSectionTitle = (id: string): string => {
    switch (id) {
      case "overview":
        return "Security Operations Center (SOC)";
      case "directory":
        return "Directory & Decentralized Identity (IAM)";
      case "vault":
        return "Digital Twin Vault & Physical IoT Registry";
      case "transfer":
        return "AI Zero-Trust Transfer Portal";
      case "approvals":
        return "Governance & Multi-Party Approval Queue";
      case "siem":
        return "SIEM Event Telemetry & Audit Operations";
      case "simulator":
        return "AI Threat Operations Center";
      default:
        return "Security Center";
    }
  };

  // ── 1. Disconnected State ──────────────────────────────────────────
  if (!account) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              ACD
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">Active Chain Directory</span>
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Enterprise Zero-Trust IAM</span>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-white">Enterprise Access Required</h1>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Connect to the local Hardhat private network or authenticate via MetaMask to initialize zero-trust identity and role permissions.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => connectLocal(0)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/25 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                ⚡ Initialize Local Node (Admin Persona)
              </button>
              <button
                onClick={connectWallet}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 hover:border-white/25 active:scale-[0.99]"
              >
                🦊 Connect MetaMask Provider
              </button>
            </div>

            <div className="mt-6 border-t border-white/5 pt-4 text-[11px] text-gray-500">
              Target Environment: <code className="font-mono text-gray-400">127.0.0.1:8545</code> (Chain ID: 31337)
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── 2. Connected Application Shell ─────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(id) => setCurrentSection(id)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <Header
          currentSectionTitle={getSectionTitle(currentSection)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Network Warning Banner */}
        {!isCorrectNetwork && (
          <div className="border-b border-red-500/30 bg-red-950/50 px-6 py-2.5 text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <span>
                Connected to Chain ID <strong>{chainId}</strong>. Smart contract operations require <strong>Hardhat Local (31337)</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto">
          {/* Section: Overview (Landing Dashboard) */}
          {currentSection === "overview" && (
            <DashboardOverview onNavigate={(sec) => setCurrentSection(sec)} />
          )}

          {/* Section: Directory IAM */}
          {currentSection === "directory" && (
            <div className="space-y-8">
              {currentRole === "ADMIN" ? (
                <>
                  <AdminDirectory />
                  <div className="border-t border-white/10 pt-4">
                    <UserDashboard />
                  </div>
                </>
              ) : (
                <UserDashboard />
              )}
            </div>
          )}

          {/* Section: Digital Twin Vault */}
          {currentSection === "vault" && (
            <AssetManagement mode="vault" />
          )}

          {/* Section: AI Zero-Trust Transfer */}
          {currentSection === "transfer" && (
            <AssetManagement mode="transfer" />
          )}

          {/* Section: Governance & Approvals */}
          {currentSection === "approvals" && (
            <ApprovalCenter />
          )}

          {/* Section: SIEM Operations */}
          {currentSection === "siem" && (
            <AuditDashboard />
          )}

          {/* Section: Attack Simulator (Milestone 2 Placeholder) */}
          {currentSection === "simulator" && (
            <AttackSimulatorPlaceholder />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <MainWorkspace />
    </Web3Provider>
  );
}
