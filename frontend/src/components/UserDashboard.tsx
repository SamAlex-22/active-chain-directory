import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  MANAGER: "bg-blue-600/20 text-blue-300 border-blue-500/40",
  AUDITOR: "bg-amber-600/20 text-amber-300 border-amber-500/40",
  USER: "bg-slate-600/20 text-slate-300 border-slate-500/40",
  NONE: "bg-gray-700/20 text-gray-400 border-gray-600/40",
};

// ── Types ──────────────────────────────────────────────────────────
interface IdentityProfile {
  isActive: boolean;
  registeredAt: string;
  didUri: string;
}

interface AssetData {
  tokenId: string;
  tokenURI: string;
  iotTagId: string;
}

// ── Main Component ─────────────────────────────────────────────────
export default function UserDashboard() {
  const { account, currentRole, identityRegistry, assetNFT } = useWeb3();

  // Profile State
  const [profile, setProfile] = useState<IdentityProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Asset Verify State
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Fetch Profile on Mount ───────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!identityRegistry || !account) return;
      setProfileLoading(true);
      try {
        const data = await identityRegistry.getIdentity(account);
        const registeredAt = Number(data.registeredAt);
        if (isMounted) {
          setProfile({
            isActive: data.isActive,
            registeredAt: registeredAt === 0 ? "Not Registered" : new Date(registeredAt * 1000).toLocaleString(),
            didUri: data.didUri || "—",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, [identityRegistry, account]);

  // ── Asset Verification Handler ───────────────────────────────────
  const handleVerifyAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNFT || !lookupId || !account) return;
    setLookupLoading(true);
    setAssetData(null);
    setErrorMsg("");
    try {
      const tokenId = BigInt(lookupId);
      
      // Check ownership first
      const owner = await assetNFT.ownerOf(tokenId);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        setErrorMsg("You do not own this asset. Access Denied.");
        return;
      }

      const tokenURI = await assetNFT.tokenURI(tokenId);
      const iotTagId = await assetNFT.iotTagIds(tokenId);

      setAssetData({
        tokenId: tokenId.toString(),
        tokenURI,
        iotTagId: iotTagId || "—",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      if (message.includes("revert") || message.includes("ERC721")) {
        setErrorMsg("Token ID does not exist.");
      } else {
        setErrorMsg("An error occurred while verifying the asset.");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  // If no account is connected, don't render anything
  if (!account) return null;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-white/10 pb-5">
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="mt-1 text-sm text-gray-400">View your verified directory identity and manage your assets.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Section 1: My Identity Profile ─────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/15">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Identity Details</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${ROLE_STYLES[currentRole]}`}>
              {currentRole}
            </span>
          </div>

          {profileLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : profile ? (
            <dl className="grid gap-5 rounded-lg border border-white/5 bg-black/20 p-5">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    profile.isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                    {profile.isActive ? "Active" : profile.registeredAt === "Not Registered" ? "Not Registered" : "Deactivated"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Registration Date</dt>
                <dd className="mt-1 text-sm font-medium text-gray-300">{profile.registeredAt}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">DID URI (Off-chain Metadata)</dt>
                <dd className="mt-1 break-all font-mono text-sm text-gray-300">{profile.didUri}</dd>
              </div>
            </dl>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
              No profile found. Please contact an admin.
            </div>
          )}
        </div>

        {/* ── Section 2: Asset Viewer ───────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Verify My Asset</h2>
          </div>
          
          <form onSubmit={handleVerifyAsset} className="flex gap-3">
            <input
              type="number"
              min="1"
              placeholder="Enter Token ID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
              required
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lookupLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Verify"
              )}
            </button>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              <span className="mr-2">✗</span>
              {errorMsg}
            </div>
          )}

          {/* Asset Record Card */}
          {assetData && !errorMsg && (
            <div className="mt-5 overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-transparent shadow-xl animate-[slideUp_0.3s_ease-out]">
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-400">Verified Asset Record</h3>
                <span className="text-xs font-mono text-gray-500">#{assetData.tokenId}</span>
              </div>
              <div className="p-5">
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Ownership Status</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
                      Verified Owner
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
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_6px] shadow-indigo-400/60" />
                      <span className="font-mono text-sm text-gray-200">{assetData.iotTagId}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
