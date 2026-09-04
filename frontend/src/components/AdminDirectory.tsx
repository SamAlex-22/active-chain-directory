import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { id as ethersId } from "ethers";

// ── Role hash mapping ──────────────────────────────────────────────
const ROLE_OPTIONS = [
  { label: "Manager", value: "MANAGER_ROLE" },
  { label: "Auditor", value: "AUDITOR_ROLE" },
];

const ALL_ROLES = [
  { label: "ADMIN", hash: ethersId("ADMIN_ROLE") },
  { label: "MANAGER", hash: ethersId("MANAGER_ROLE") },
  { label: "AUDITOR", hash: ethersId("AUDITOR_ROLE") },
  { label: "USER", hash: ethersId("USER_ROLE") },
];

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

// ── Identity Lookup result type ────────────────────────────────────
interface LookupResult {
  isActive: boolean;
  registeredAt: string;
  didUri: string;
  roles: string[];
}

// ── Main Component ─────────────────────────────────────────────────
export default function AdminDirectory() {
  const { currentRole, identityRegistry, roleManager } = useWeb3();

  // Register Identity state
  const [regAddress, setRegAddress] = useState("");
  const [regDidUri, setRegDidUri] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Assign Role state
  const [roleAddress, setRoleAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("MANAGER_ROLE");
  const [roleLoading, setRoleLoading] = useState(false);

  // Identity Lookup state
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Access Control Gate ──────────────────────────────────────────
  if (currentRole !== "ADMIN") {
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
            This console is restricted to accounts holding the <code className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs">ADMIN_ROLE</code>. Your current role is <strong>{currentRole}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Register Identity Handler ────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityRegistry || !regAddress) return;
    setRegLoading(true);
    try {
      const tx = await identityRegistry.registerIdentity(regAddress, regDidUri);
      await tx.wait();
      showToast(`Identity registered for ${regAddress.slice(0, 8)}…`, "success");
      setRegAddress("");
      setRegDidUri("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
      showToast(shortMsg, "error");
    } finally {
      setRegLoading(false);
    }
  };

  // ── Assign Role Handler ──────────────────────────────────────────
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleManager || !roleAddress) return;
    setRoleLoading(true);
    try {
      const roleHash = ethersId(selectedRole);
      const tx = await roleManager.grantRole(roleHash, roleAddress);
      await tx.wait();
      showToast(`${selectedRole.replace("_ROLE", "")} role granted to ${roleAddress.slice(0, 8)}…`, "success");
      setRoleAddress("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
      showToast(shortMsg, "error");
    } finally {
      setRoleLoading(false);
    }
  };

  // ── Identity Lookup Handler ──────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityRegistry || !roleManager || !lookupAddress) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const profile = await identityRegistry.getIdentity(lookupAddress);
      const registeredAt = Number(profile.registeredAt);

      // Check all roles
      const heldRoles: string[] = [];
      for (const r of ALL_ROLES) {
        if (await roleManager.hasRole(r.hash, lookupAddress)) {
          heldRoles.push(r.label);
        }
      }

      setLookupResult({
        isActive: profile.isActive,
        registeredAt: registeredAt === 0 ? "Not Registered" : new Date(registeredAt * 1000).toLocaleString(),
        didUri: profile.didUri || "—",
        roles: heldRoles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      const shortMsg = message.length > 80 ? message.slice(0, 80) + "…" : message;
      showToast(shortMsg, "error");
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Directory Console</h1>
        <p className="mt-1 text-sm text-gray-400">Manage identities and access control roles on-chain</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Section 1: Register Identity ───────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Register Identity</h2>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">User Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">DID URI <span className="text-gray-600">(off-chain metadata)</span></label>
              <input
                type="text"
                placeholder="ipfs://..."
                value={regDidUri}
                onChange={(e) => setRegDidUri(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                required
              />
            </div>
            <button
              type="submit"
              disabled={regLoading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {regLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Registering…
                </span>
              ) : (
                "Register Identity"
              )}
            </button>
          </form>
        </div>

        {/* ── Section 2: Assign Role ─────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Assign Directory Role</h2>
          </div>
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">User Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={roleAddress}
                onChange={(e) => setRoleAddress(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-gray-900 px-3.5 py-2.5 text-sm text-gray-200 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={roleLoading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {roleLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Assigning…
                </span>
              ) : (
                "Grant Role"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Section 3: Identity Lookup ─────────────────────────── */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Identity Lookup</h2>
        </div>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            placeholder="Search wallet address (0x...)"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
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

        {/* Lookup Results */}
        {lookupResult && (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    lookupResult.isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${lookupResult.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                    {lookupResult.isActive ? "Active" : lookupResult.registeredAt === "Not Registered" ? "Not Registered" : "Deactivated"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Registered At</dt>
                <dd className="mt-1 text-sm text-gray-300">{lookupResult.registeredAt}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500">DID URI</dt>
                <dd className="mt-1 break-all font-mono text-sm text-gray-300">{lookupResult.didUri}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500">Assigned Roles</dt>
                <dd className="mt-1.5 flex flex-wrap gap-2">
                  {lookupResult.roles.length > 0 ? (
                    lookupResult.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No roles assigned</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
