import { useWeb3, type Role } from "../context/Web3Context";

export interface NavSection {
  id: string;
  label: string;
  icon: string;
  allowedRoles: Role[];
  badge?: string;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Security Center",
    icon: "🛡️",
    allowedRoles: ["ADMIN", "MANAGER", "AUDITOR", "USER", "NONE"],
  },
  {
    id: "directory",
    label: "Directory IAM",
    icon: "🏢",
    allowedRoles: ["ADMIN", "USER"], // Admin can manage; Users can view their own profile
  },
  {
    id: "vault",
    label: "Digital Twin Vault",
    icon: "📦",
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    id: "transfer",
    label: "AI Zero-Trust Transfer",
    icon: "⚡",
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    id: "approvals",
    label: "Governance & Approvals",
    icon: "⚖️",
    allowedRoles: ["ADMIN"],
  },
  {
    id: "siem",
    label: "SIEM Operations",
    icon: "📊",
    allowedRoles: ["ADMIN", "AUDITOR"],
  },
  {
    id: "simulator",
    label: "Threat Operations",
    icon: "🧪",
    allowedRoles: ["ADMIN", "MANAGER"],
    badge: "SOC",
  },
];

interface SidebarProps {
  currentSection: string;
  onSelectSection: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentSection, onSelectSection, isOpen, onClose }: SidebarProps) {
  const { currentRole } = useWeb3();

  const isAccessible = (allowed: Role[]) => {
    // If not connected, overview is allowed
    if (allowed.includes("NONE")) return true;
    return allowed.includes(currentRole);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-gray-950/95 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Application Branding ──────────────────────────────────── */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ACD</span>
                <span className="text-[10px] text-indigo-400 font-mono font-medium">v1.0</span>
              </div>
              <div className="text-[10px] text-gray-400 tracking-tight font-medium">
                Active Chain Directory
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Subtitle tag */}
        <div className="px-5 py-2.5 bg-white/[0.01] border-b border-white/5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
            Decentralized Zero-Trust Security
          </p>
        </div>

        {/* ── Navigation Items ─────────────────────────────────────── */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Command Center Workspaces
          </div>

          {NAV_SECTIONS.map((item) => {
            const active = currentSection === item.id;
            const accessible = isAccessible(item.allowedRoles);

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm"
                    : accessible
                    ? "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    : "text-gray-600 hover:bg-white/[0.02] hover:text-gray-400 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="text-sm">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.badge && (
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                  {!accessible && (
                    <span className="text-[10px] text-gray-600" title="Clearance Required">
                      🔒
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* ── Sidebar Footer: Active Clearance ──────────────────────── */}
        <div className="border-t border-white/10 p-3.5 bg-black/20">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-500 font-medium">Clearance Level</span>
            <span
              className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                currentRole === "ADMIN"
                  ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                  : currentRole === "MANAGER"
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                  : currentRole === "AUDITOR"
                  ? "bg-amber-600/20 text-amber-300 border-amber-500/40"
                  : currentRole === "USER"
                  ? "bg-slate-600/20 text-slate-300 border-slate-500/40"
                  : "bg-gray-800 text-gray-400 border-gray-700"
              }`}
            >
              {currentRole}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            EVM Authoritative RBAC
          </div>
        </div>
      </aside>
    </>
  );
}
