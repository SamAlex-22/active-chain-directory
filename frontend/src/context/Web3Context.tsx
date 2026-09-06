import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { BrowserProvider, JsonRpcProvider, JsonRpcSigner, Contract } from "ethers";

import contractConfig from "../contracts/contract-config.json";
import RoleManagerABI from "../contracts/RoleManager.json";
import IdentityRegistryABI from "../contracts/IdentityRegistry.json";
import AuditRegistryABI from "../contracts/AuditRegistry.json";
import AssetNFTABI from "../contracts/AssetNFT.json";

// ── Types ──────────────────────────────────────────────────────────
export type Role = "ADMIN" | "MANAGER" | "AUDITOR" | "USER" | "NONE";

export interface DemoPersona {
  index: number;
  label: string;
  name: string;
  expectedRole: Role;
  icon: string;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { index: 0, label: "Admin", name: "Domain Administrator", expectedRole: "ADMIN", icon: "👑", description: "Full directory governance, asset oversight, approval rights" },
  { index: 1, label: "Asset Manager", name: "Asset Operations Lead", expectedRole: "MANAGER", icon: "👔", description: "Mint digital twins, evaluate & initiate transfers" },
  { index: 2, label: "Chief Auditor", name: "SIEM Security Auditor", expectedRole: "AUDITOR", icon: "🔍", description: "Continuous compliance & immutable audit ledger access" },
  { index: 3, label: "Standard Employee", name: "General Personnel", expectedRole: "USER", icon: "👤", description: "DID identity verification & personal asset inspection" },
];

interface Web3State {
  account: string | null;
  signer: JsonRpcSigner | null;
  provider: JsonRpcProvider | BrowserProvider | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  currentRole: Role;
  connectionMode: "metamask" | "local" | null;
  activePersonaIndex: number;
  roleManager: Contract | null;
  identityRegistry: Contract | null;
  auditRegistry: Contract | null;
  assetNFT: Contract | null;
  connectWallet: () => Promise<void>;
  connectLocal: (accountIndex?: number) => Promise<void>;
  switchPersona: (index: number) => Promise<void>;
  switchNetwork: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const HARDHAT_CHAIN_ID = 31337;
const LOCAL_RPC_URL = "http://127.0.0.1:8545";

// ── Context ────────────────────────────────────────────────────────
const Web3Context = createContext<Web3State | undefined>(undefined);

export function useWeb3(): Web3State {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}

// ── Helper: bind contracts to signer ───────────────────────────────
function bindContracts(signer: JsonRpcSigner) {
  return {
    roleManager: new Contract(contractConfig.RoleManager, RoleManagerABI, signer),
    identityRegistry: new Contract(contractConfig.IdentityRegistry, IdentityRegistryABI, signer),
    auditRegistry: new Contract(contractConfig.AuditRegistry, AuditRegistryABI, signer),
    assetNFT: new Contract(contractConfig.AssetNFT, AssetNFTABI, signer),
  };
}

// ── Provider ───────────────────────────────────────────────────────
export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<JsonRpcProvider | BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>("NONE");
  const [connectionMode, setConnectionMode] = useState<"metamask" | "local" | null>(null);
  const [activePersonaIndex, setActivePersonaIndex] = useState<number>(0);

  const [roleManager, setRoleManager] = useState<Contract | null>(null);
  const [identityRegistry, setIdentityRegistry] = useState<Contract | null>(null);
  const [auditRegistry, setAuditRegistry] = useState<Contract | null>(null);
  const [assetNFT, setAssetNFT] = useState<Contract | null>(null);

  const isCorrectNetwork = chainId === HARDHAT_CHAIN_ID;

  // ── evaluateRole: queries contract directly ───────────────────────
  const evaluateRole = useCallback(async (rm: Contract, targetAccount: string): Promise<Role> => {
    try {
      const adminRole = await rm.ADMIN_ROLE();
      const managerRole = await rm.MANAGER_ROLE();
      const auditorRole = await rm.AUDITOR_ROLE();
      const userRole = await rm.USER_ROLE();

      if (await rm.hasRole(adminRole, targetAccount)) {
        return "ADMIN";
      }
      if (await rm.hasRole(managerRole, targetAccount)) {
        return "MANAGER";
      }
      if (await rm.hasRole(auditorRole, targetAccount)) {
        return "AUDITOR";
      }
      if (await rm.hasRole(userRole, targetAccount)) {
        return "USER";
      }
      return "NONE";
    } catch {
      return "NONE";
    }
  }, []);

  // ── refreshRole ──────────────────────────────────────────────────
  const refreshRole = useCallback(async () => {
    if (!roleManager || !account) {
      setCurrentRole("NONE");
      return;
    }
    const detected = await evaluateRole(roleManager, account);
    setCurrentRole(detected);
  }, [roleManager, account, evaluateRole]);

  // ── connectLocal (direct JSON-RPC to Hardhat node) ───────────────
  const connectLocal = useCallback(async (accountIndex: number = 0) => {
    try {
      const jsonRpcProvider = new JsonRpcProvider(LOCAL_RPC_URL);
      const network = await jsonRpcProvider.getNetwork();
      const localChainId = Number(network.chainId);

      const localSigner = await jsonRpcProvider.getSigner(accountIndex);
      const walletAddress = await localSigner.getAddress();

      setProvider(jsonRpcProvider);
      setSigner(localSigner);
      setAccount(walletAddress);
      setChainId(localChainId);
      setConnectionMode("local");
      setActivePersonaIndex(accountIndex);

      const contracts = bindContracts(localSigner);
      setRoleManager(contracts.roleManager);
      setIdentityRegistry(contracts.identityRegistry);
      setAuditRegistry(contracts.auditRegistry);
      setAssetNFT(contracts.assetNFT);

      // If connecting as Admin (index 0), seed demo roles for local testing if needed
      if (accountIndex === 0) {
        try {
          const signer1 = await jsonRpcProvider.getSigner(1);
          const addr1 = await signer1.getAddress();
          const managerRole = await contracts.roleManager.MANAGER_ROLE();
          const hasMgr = await contracts.roleManager.hasRole(managerRole, addr1);
          if (!hasMgr) {
            const signer2 = await jsonRpcProvider.getSigner(2);
            const addr2 = await signer2.getAddress();
            const signer3 = await jsonRpcProvider.getSigner(3);
            const addr3 = await signer3.getAddress();
            const auditorRole = await contracts.roleManager.AUDITOR_ROLE();
            const userRole = await contracts.roleManager.USER_ROLE();
            await (await contracts.roleManager.grantRole(managerRole, addr1)).wait();
            await (await contracts.roleManager.grantRole(auditorRole, addr2)).wait();
            await (await contracts.roleManager.grantRole(userRole, addr3)).wait();
          }
        } catch {
          // ignore seeding errors if node is not running or accounts don't exist
        }
      }

      const role = await evaluateRole(contracts.roleManager, walletAddress);
      setCurrentRole(role);
    } catch (err) {
      console.error("Failed to connect to local Hardhat node:", err);
      alert("Could not connect to Hardhat node at " + LOCAL_RPC_URL + ". Is it running?");
    }
  }, [evaluateRole]);

  // ── switchPersona: 1-click persona switch in local mode ───────────
  const switchPersona = useCallback(async (index: number) => {
    await connectLocal(index);
  }, [connectLocal]);

  // ── connectWallet (MetaMask) ─────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      await connectLocal(0);
      return;
    }

    const browserProvider = new BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []);

    const walletSigner = await browserProvider.getSigner();
    const walletAddress = await walletSigner.getAddress();
    const network = await browserProvider.getNetwork();
    const walletChainId = Number(network.chainId);

    setProvider(browserProvider);
    setSigner(walletSigner);
    setAccount(walletAddress);
    setChainId(walletChainId);
    setConnectionMode("metamask");

    const contracts = bindContracts(walletSigner);
    setRoleManager(contracts.roleManager);
    setIdentityRegistry(contracts.identityRegistry);
    setAuditRegistry(contracts.auditRegistry);
    setAssetNFT(contracts.assetNFT);

    const role = await evaluateRole(contracts.roleManager, walletAddress);
    setCurrentRole(role);
  }, [connectLocal, evaluateRole]);

  // ── switchNetwork ────────────────────────────────────────────────
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const hexChainId = "0x" + HARDHAT_CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: "Hardhat Local",
              rpcUrls: [LOCAL_RPC_URL],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      }
    }
  }, []);

  // ── Detect role whenever contracts or account change ─────────────
  useEffect(() => {
    if (roleManager && account && isCorrectNetwork) {
      refreshRole();
    }
  }, [roleManager, account, isCorrectNetwork, refreshRole]);

  // ── MetaMask event listeners ─────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum || connectionMode !== "metamask") return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        setSigner(null);
        setCurrentRole("NONE");
      } else {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [connectWallet, connectionMode]);

  return (
    <Web3Context.Provider
      value={{
        account,
        signer,
        provider,
        chainId,
        isCorrectNetwork,
        currentRole,
        connectionMode,
        activePersonaIndex,
        roleManager,
        identityRegistry,
        auditRegistry,
        assetNFT,
        connectWallet,
        connectLocal,
        switchPersona,
        switchNetwork,
        refreshRole,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
