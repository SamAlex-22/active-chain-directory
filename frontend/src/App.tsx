import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import AdminDirectory from "./components/AdminDirectory";
import AssetManagement from "./components/AssetManagement";
import UserDashboard from "./components/UserDashboard";
import AuditDashboard from "./components/AuditDashboard";
import ApprovalCenter from "./components/ApprovalCenter";
import contractConfig from "./contracts/contract-config.json";

function Dashboard() {
  const { account, isCorrectNetwork, currentRole, chainId, connectLocal, connectWallet } = useWeb3();

  if (!account) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="mx-4 max-w-lg rounded-2xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Welcome to ACD</h2>
          <p className="mb-8 text-sm text-gray-400">
            Connect to your local Hardhat node or use MetaMask to interact with the Active Chain Directory smart contracts.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={connectLocal}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98]"
            >
              ⚡ Connect to Local Hardhat Node
            </button>
            <button
              onClick={connectWallet}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
            >
              🦊 Connect MetaMask
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-600">
            Ensure <code className="text-gray-500">npx hardhat node</code> is running on port 8545
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Network warning banner */}
      {!isCorrectNetwork && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            You are connected to Chain ID <strong>{chainId}</strong>. Please switch to <strong>Hardhat Local (31337)</strong> to use this app.
          </span>
        </div>
      )}

      {/* Status header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Connected as <span className="font-semibold text-indigo-400">{currentRole}</span> on Chain {chainId}
        </p>
      </div>

      {/* Contract addresses grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(contractConfig).map(([name, address]) => (
          <div
            key={name}
            className="group rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
              <h3 className="text-sm font-semibold text-gray-200">{name}</h3>
            </div>
            <p className="break-all font-mono text-xs text-gray-500 transition-colors group-hover:text-gray-400">
              {address}
            </p>
          </div>
        ))}
      </div>

      {/* Connection info */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Connection Details</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Wallet Address</dt>
            <dd className="mt-0.5 break-all font-mono text-sm text-gray-300">{account}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Chain ID</dt>
            <dd className="mt-0.5 font-mono text-sm text-gray-300">{chainId}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Network Status</dt>
            <dd className={`mt-0.5 text-sm font-medium ${isCorrectNetwork ? "text-emerald-400" : "text-red-400"}`}>
              {isCorrectNetwork ? "✓ Hardhat Local" : "✗ Wrong Network"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Detected Role</dt>
            <dd className="mt-0.5 text-sm font-semibold text-indigo-400">{currentRole}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function MainLayout() {
  const { account } = useWeb3();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <Dashboard />
      {account && (
        <>
          <AdminDirectory />
          <AssetManagement />
          <UserDashboard />
          <AuditDashboard />
          <ApprovalCenter />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <MainLayout />
    </Web3Provider>
  );
}
