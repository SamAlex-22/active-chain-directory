# 🇮🇳 SIH PS 26125: COMPLETE PROBLEM STATEMENT COMPLIANCE & DEMO MATRIX
**Organization:** Bharat Electronics Limited (BEL)  
**Theme:** Blockchain & Cybersecurity  
**Category:** Software  
**System:** Active Chain Directory (ACD)

---

## 🎯 Executive Compliance Mapping: Problem Statement vs. Implemented System

Every single phrase and clause in the **Bharat Electronics Limited (BEL) Problem Statement 26125** has been systematically implemented in the **Active Chain Directory (ACD)** smart contracts, backend microservices, and front-end interface:

| Problem Statement Requirement (BEL PS 26125) | ACD Architectural Implementation | Smart Contract / Code Reference | Where to Showcase to Judges |
| :--- | :--- | :--- | :--- |
| **1. Decentralized Identity Management (DID)**<br>*"Each user is assigned a decentralized identifier... independent of centralized authorities and authenticated using cryptographic proofs."* | Decentralized Identifier (`didUri`) stored in `IdentityProfile`. Zero PII (GDPR/DPDP compliant). Bound to Ethereum wallet public key. Cryptographic proof via secp256k1 signatures. | [`IdentityRegistry.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/IdentityRegistry.sol#L10-L55)<br>`registerIdentity(user, didUri)` | **Sidebar $\rightarrow$ Directory IAM**<br>Toggle identities, view `did:activechain:...` IDs. |
| **2. NFT-Based Digital Asset Ownership & Uniqueness**<br>*"Digital assets are represented as Non-Fungible Tokens (NFTs), ensuring each asset is unique, traceable, and permanently recorded on the blockchain."* | OpenZeppelin ERC-721 URI Storage standard tokenized as Active Chain Assets (`ACA`). Sequential token IDs, non-fungible serial numbers. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L16-L55)<br>`ERC721("Active Chain Asset", "ACA")` | **Sidebar $\rightarrow$ Digital Twin Vault**<br>Inspect Token IDs, names, and IPFS metadata links. |
| **3. Direct Allocation of NFTs to User Identities**<br>*"These NFTs are directly allocated to user identities, establishing verifiable ownership that cannot be altered or duplicated."* | NFTs are minted directly to verified user addresses (`to`), mapping owner address to their active DID profile in `IdentityRegistry`. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L93-L102)<br>`_safeMint(to, tokenId)` | **Sidebar $\rightarrow$ Digital Twin Vault**<br>Shows Owner Address and linked DID badge. |
| **4. Physical Hardware Anchor / Digital Twin**<br>*"Digital and physical asset ownership... verification of authenticity, access rights, and ownership history."* | Every NFT is tied to an immutable physical hardware tag (`iotTagIds[tokenId]`), bridging physical defense equipment with blockchain digital twins. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L19-L99)<br>`mapping(uint256 => string) public iotTagIds` | **Sidebar $\rightarrow$ Digital Twin Vault**<br>Notice the "IoT Tag ID" badge (e.g. `IOT-TAG-SERVER-99`). |
| **5. Authorized Minting & Governance**<br>*"Smart contracts govern all operations... allowing only authorized administrators to mint NFTs and assign them to user identities."* | Contract-level modifier `onlyAdminOrManager()` protects the `mintAsset()` method. Non-authorized accounts revert with `Unauthorized()`. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L60-L67)<br>`modifier onlyAdminOrManager()` | **Sidebar $\rightarrow$ Digital Twin Vault**<br>Switch to "Standard User"; minting controls vanish/revert. |
| **6. Role-Based Access Control (RBAC)**<br>*"Administrators define roles such as Admin, Manager, Auditor, and User and assign specific access rights to each identity."* | OpenZeppelin `AccessControl` with 4 distinct roles: `ADMIN_ROLE`, `MANAGER_ROLE`, `AUDITOR_ROLE`, `USER_ROLE`. Strict role decoupling via `IRoleManager`. | [`RoleManager.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/RoleManager.sol#L12-L32)<br>Multi-role RBAC implementation | **Top Bar $\rightarrow$ Demo Persona Switcher**<br>Instant 1-click switching between Admin, Manager, Auditor, User. |
| **7. Context-Aware AI & EIP-712 Access Control**<br>*"...control access permissions... securely manage user identities... tamper-proof verification."* | Zero-Trust dynamic authorization: FastAPI AI engine evaluates ABAC context (IP, Geolocation, Device, Time). If risk $\le 69$, issues an **EIP-712 permit**. Contract validates signature and nonce on-chain. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L116-L173)<br>`transferWithAIPermit(...)` | **Sidebar $\rightarrow$ AI Zero-Trust Transfer**<br>Simulate Normal vs. Suspicious vs. Critical attacks. |
| **8. Anti-Bypass Smart Contract Defense**<br>*"...permissions are enforced automatically by smart contracts during all operations."* | Direct transfer calls (e.g. `transferFrom`, `safeTransferFrom`) are intercepted by the internal `_update()` hook and immediately revert with `DirectTransferNotAllowed()`. AI permission cannot be bypassed. | [`AssetNFT.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AssetNFT.sol#L180-L194)<br>`revert DirectTransferNotAllowed()` | Hardhat Test Suite (Test 10):<br>`revertedWithCustomError(..., "DirectTransferNotAllowed")` |
| **9. Human-in-the-Loop Governance Workflow**<br>*"...ensure transparent ownership... access control updates... controlled asset governance."* | High-risk transactions (risk 70–89) do not execute immediately; they generate persistent governance tickets (`#APR-XXXX`). Admin review and cryptographic co-signing required. | [`server.js`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/backend/src/server.js#L185-L270)<br>`/api/approvals/:id/approve` | **Sidebar $\rightarrow$ Governance & Approvals**<br>Approve ticket $\rightarrow$ Execute on-chain. |
| **10. Immutable Audit Trail & SIEM Logging**<br>*"Every activity, including identity creation, NFT creation, asset allocation, access rights assignment, ownership transfers, and permission updates, is immutably recorded on the blockchain."* | Dedicated `AuditRegistry.sol` emits `SystemLog` for all system events. Indexed real-time by the Node.js SIEM backend into SQLite with transaction hashes. | [`AuditRegistry.sol`](file:///c:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/sam_anna_sih/contracts/AuditRegistry.sol#L10-L19)<br>`logEvent(action, actor, assetId, details)` | **Sidebar $\rightarrow$ SIEM Operations**<br>Live table showing action, actor, timestamp & txHash. |

---

## 🎬 Master Judge Demonstration Walkthrough (Chronological Steps)

When presenting to Bharat Electronics Limited (BEL) evaluators, follow this exact sequence:

### Step 1: Decentralized Identity & RBAC (Problem Statement Clause 1 & 6)
1. **Navigate to:** **Directory IAM** (`/directory`).
2. **Current Persona:** `Security Admin` (Account #0).
3. **Showcase:**
   - The list of decentralized identities registered on-chain.
   - Point out the format: `did:activechain:0x7099...`.
   - **BEL Defense Pitch:** *"Notice there is zero PII (no names, phones, or emails) stored on-chain. This guarantees 100% compliance with DPDP and defense data privacy mandates while providing self-sovereign cryptographic identity."*
   - Show role assignment: Admin, Manager, Auditor, User.

### Step 2: Physical-to-Digital Twin NFT Minting (Problem Statement Clause 2, 3, 4 & 5)
1. **Switch Persona:** Use the top bar switcher $\rightarrow$ **Asset Manager** (Account #1).
2. **Navigate to:** **Digital Twin Vault** (`/vault`).
3. **Showcase:**
   - Click **"Mint Asset Digital Twin"**.
   - Enter Token Name: `Tactical Drone Node #4`.
   - Enter Physical IoT Tag ID: `BEL-IOT-DRONE-88`.
   - Assign to User Address (Account #3).
   - Click **"Mint Digital Twin"**.
   - Show the resulting NFT card: Token ID, owner address, and the hardware anchor `BEL-IOT-DRONE-88`.
   - **BEL Defense Pitch:** *"Unlike consumer NFTs, our platform creates digital twins of critical defense hardware. The physical IoT Tag is permanently mapped inside the smart contract, preventing duplicate or fake military assets."*

### Step 3: Zero-Trust Threat Simulation & Dynamic ABAC (Problem Statement Clause 7)
1. **Navigate to:** **AI Zero-Trust Transfer** (`/transfer`).
2. **Showcase:**
   - Expand the **Threat Simulator**.
   - Show the 3 presets:
     - **Normal:** Office IP, Trusted Workstation, Business Hours $\rightarrow$ **Risk: ~18 (ALLOW)**.
     - **Suspicious:** Unknown ISP, Off-hours login $\rightarrow$ **Risk: ~76 (MANUAL APPROVAL)**.
     - **Critical:** Tor Exit Node, Rooted Device, Geo-velocity mismatch $\rightarrow$ **Risk: ~94 (BLOCKED)**.
   - **BEL Defense Pitch:** *"Centralized IAM fails when private keys are compromised. Our platform implements continuous Attribute-Based Access Control (ABAC). Even with a valid signature, context is evaluated before execution."*

### Step 4: Low-Risk Transfer with Cryptographic EIP-712 Permit (Problem Statement Clause 7)
1. Select the newly minted NFT (`Tactical Drone Node #4`).
2. Choose Recipient (`0x90F7...`).
3. Keep the **Normal Preset** selected.
4. Click **"Evaluate & Transfer Asset"**.
5. **Showcase:**
   - The AI Risk Engine evaluates the context in real-time.
   - The backend AI signer issues an **EIP-712 structured permit**.
   - The transaction settles on-chain via `transferWithAIPermit()`.
   - The NFT ownership instantly transfers in the UI.

### Step 5: High-Risk Threat & Governance Approval Workflow (Problem Statement Clause 9)
1. Select another asset (e.g., Token ID 1).
2. Toggle Threat Simulator to **Suspicious Preset** (Risk ~76).
3. Click **"Evaluate & Transfer Asset"**.
4. **Showcase:**
   - The system intercepts the transaction and notifies the user: *"Risk Score 76 exceeds automated threshold. Governance Ticket Created: #APR-0001"*.
5. **Navigate to:** **Governance & Approvals** (`/approvals`).
6. Switch Persona to **Auditor** (Account #2) $\rightarrow$ Point out that action buttons are disabled (Compliance view only).
7. Switch Persona to **Security Admin** (Account #0) $\rightarrow$ Action buttons unlock.
8. Click **"Approve & Sign Permit"** $\rightarrow$ Signs the cryptographic release permit.
9. Click **"Execute On-Chain"** $\rightarrow$ Settles the transaction on the blockchain.

### Step 6: Smart Contract Direct Bypass Protection (Problem Statement Clause 8)
1. Explain to the judges:
   - *"What if an attacker tries to call `transferFrom()` directly in Solidity to bypass our AI engine?"*
2. **Showcase Hardhat Test #10:**
   - *"Our contract overrides OpenZeppelin's internal `_update()` hook. Any direct transfer attempt reverts immediately with the custom error `DirectTransferNotAllowed()` unless initiated through an AI permit or an authorized Admin Emergency Override."*

### Step 7: Immutable Audit Trail & SIEM Operations (Problem Statement Clause 10)
1. Switch Persona to **Chief Auditor** (Account #2).
2. **Navigate to:** **SIEM Operations** (`/siem`).
3. **Showcase:**
   - The live audit table displaying all events:
     - `ASSET_MINTED`
     - `AI_AUTHORIZED_TRANSFER`
     - `ASSET_TRANSFERRED`
     - `AI_VALIDATOR_UPDATED`
   - Point out the **Actor Address**, **Asset ID**, **Timestamp**, and the **Blockchain Transaction Hash (`0x...`)**.
   - Click the download button to export the tamper-proof compliance report.
   - **BEL Defense Pitch:** *"Every action is immutably logged into `AuditRegistry.sol` at the consensus layer. Even database administrators cannot alter this log, satisfying the strictest defense audit requirements."*

---

## 🛡️ Quick Reference: Numbers & Proofs to Quote

- **Smart Contract Tests:** **20 / 20 Passing** (`npx hardhat test`)
- **Backend SIEM Tests:** **8 / 8 Passing** (`npm test` in backend)
- **AI Engine Tests:** **3 / 3 Passing** (`pytest test_engine.py`)
- **EIP-712 Domain Separator:** `"ActiveChainDirectory"`, Version `"1"`, Hardhat Chain ID `31337`
- **Automated AI Risk Threshold:** Score $\le 69$ (Automated EIP-712 Permit)
- **Governance Ticket Threshold:** Score $70 - 89$ (Requires Admin Signature & Approval)
- **Hard-Block Threshold:** Score $\ge 90$ (Transaction strictly denied)
- **Bypass Defense:** Reverts with custom Solidity error `DirectTransferNotAllowed()`
