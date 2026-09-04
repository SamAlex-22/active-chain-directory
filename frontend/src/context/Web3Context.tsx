import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { BrowserProvider, JsonRpcProvider, JsonRpcSigner, Contract } from "ethers";

import contractConfig from "../contracts/contract-config.json";
import RoleManagerABI from "../contracts/RoleManager.json";
import IdentityRegistryABI from "../contracts/IdentityRegistry.json";
import AuditRegistryABI from "../contracts/AuditRegistry.json";
import AssetNFTABI from "../contracts/AssetNFT.json";

// ── Types ──────────────────────────────────────────────────────────
type Role = "ADMIN" | "MANAGER" | "AUDITOR" | "USER" | "NONE";

interface Web3State {
  account: string | null;
  signer: JsonRpcSigner | null;
  provider: JsonRpcProvider | BrowserProvider | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  currentRole: Role;
  connectionMode: "metamask" | "local" | null;
  roleManager: Contract | null;
  identityRegistry: Contract | null;
  auditRegistry: Contract | null;
  assetNFT: Contract | null;
  connectWallet: () => Promise<void>;
  connectLocal: () => Promise<void>;
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

  const [roleManager, setRoleManager] = useState<Contract | null>(null);
  const [identityRegistry, setIdentityRegistry] = useState<Contract | null>(null);
  const [auditRegistry, setAuditRegistry] = useState<Contract | null>(null);
  const [assetNFT, setAssetNFT] = useState<Contract | null>(null);

  const isCorrectNetwork = chainId === HARDHAT_CHAIN_ID;

  // ── refreshRole ──────────────────────────────────────────────────
  const refreshRole = useCallback(async () => {
    if (!roleManager || !account) {
      setCurrentRole("NONE");
      return;
    }
    try {
      const adminRole = await roleManager.ADMIN_ROLE();
      const managerRole = await roleManager.MANAGER_ROLE();
      const auditorRole = await roleManager.AUDITOR_ROLE();
      const userRole = await roleManager.USER_ROLE();

      if (await roleManager.hasRole(adminRole, account)) {
        setCurrentRole("ADMIN");
      } else if (await roleManager.hasRole(managerRole, account)) {
        setCurrentRole("MANAGER");
      } else if (await roleManager.hasRole(auditorRole, account)) {
        setCurrentRole("AUDITOR");
      } else if (await roleManager.hasRole(userRole, account)) {
        setCurrentRole("USER");
      } else {
        setCurrentRole("NONE");
      }
    } catch {
      setCurrentRole("NONE");
    }
  }, [roleManager, account]);

  // ── connectLocal (direct JSON-RPC to Hardhat node) ───────────────
  const connectLocal = useCallback(async () => {
    try {
      const jsonRpcProvider = new JsonRpcProvider(LOCAL_RPC_URL);
      const network = await jsonRpcProvider.getNetwork();
      const localChainId = Number(network.chainId);

      // Get Account #0 (the deployer/admin)
      const localSigner = await jsonRpcProvider.getSigner(0);
      const walletAddress = await localSigner.getAddress();

      setProvider(jsonRpcProvider);
      setSigner(localSigner);
      setAccount(walletAddress);
      setChainId(localChainId);
      setConnectionMode("local");

      const contracts = bindContracts(localSigner);
      setRoleManager(contracts.roleManager);
      setIdentityRegistry(contracts.identityRegistry);
      setAuditRegistry(contracts.auditRegistry);
      setAssetNFT(contracts.assetNFT);
    } catch (err) {
      console.error("Failed to connect to local Hardhat node:", err);
      alert("Could not connect to Hardhat node at " + LOCAL_RPC_URL + ". Is it running?");
    }
  }, []);

  // ── connectWallet (MetaMask) ─────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      // Fall back to local node if MetaMask isn't available
      await connectLocal();
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
  }, [connectLocal]);

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

  // ── MetaMask event listeners (only when using MetaMask) ──────────
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

  // ── Provide ──────────────────────────────────────────────────────
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
        roleManager,
        identityRegistry,
        auditRegistry,
        assetNFT,
        connectWallet,
        connectLocal,
        switchNetwork,
        refreshRole,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
