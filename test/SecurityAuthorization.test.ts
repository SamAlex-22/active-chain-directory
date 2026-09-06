import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("M3: Security & AI Authorization Tests", function () {
  async function deployFixture() {
    // Accounts:
    // admin = #0, manager = #1, user1 = #2, user2 = #3, aiValidator = #4, attacker = #5
    const [admin, manager, user1, user2, aiValidator, attacker] = await ethers.getSigners();

    const roleManager = await ethers.deployContract("RoleManager");
    const roleManagerAddress = await roleManager.getAddress();

    const auditRegistry = await ethers.deployContract("AuditRegistry");
    const auditRegistryAddress = await auditRegistry.getAddress();

    const assetNFT = await ethers.deployContract("AssetNFT", [
      roleManagerAddress,
      auditRegistryAddress,
      aiValidator.address
    ]);
    const assetNFTAddress = await assetNFT.getAddress();

    // Grant MANAGER_ROLE to manager
    const MANAGER_ROLE = await roleManager.MANAGER_ROLE();
    await roleManager.connect(admin).grantRole(MANAGER_ROLE, manager.address);

    // Mint token 1 to user1
    await assetNFT.connect(manager).mintAsset(user1.address, "ipfs://asset-1", "TAG-001");
    // Mint token 2 to user1 (so user1 owns both token 1 and token 2 for token mismatch tests)
    await assetNFT.connect(manager).mintAsset(user1.address, "ipfs://asset-2", "TAG-002");
    // Mint token 3 to user2
    await assetNFT.connect(manager).mintAsset(user2.address, "ipfs://asset-3", "TAG-003");

    const domain = {
      name: "ActiveChainDirectory",
      version: "1",
      chainId: 31337,
      verifyingContract: assetNFTAddress
    };

    const types = {
      AIAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "riskScore", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };

    const helperSign = async (
      signer: any,
      from: string,
      to: string,
      tokenId: bigint | number,
      riskScore: number,
      nonce: bigint | number,
      deadline: number
    ) => {
      const value = {
        from,
        to,
        tokenId: BigInt(tokenId),
        riskScore: BigInt(riskScore),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline)
      };
      return await signer.signTypedData(domain, types, value);
    };

    return {
      roleManager,
      auditRegistry,
      assetNFT,
      assetNFTAddress,
      admin,
      manager,
      user1,
      user2,
      aiValidator,
      attacker,
      domain,
      types,
      helperSign
    };
  }

  // ── Test 1 — Valid AI Authorization ──────────────────────────────
  it("Test 1: should successfully transfer token when provided valid AI authorization", async function () {
    const { assetNFT, user1, user2, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25; // LOW
    const nonce = await assetNFT.nonces(tokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const signature = await helperSign(aiValidator, user1.address, user2.address, tokenId, riskScore, nonce, deadline);

    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, deadline, signature)
    ).to.emit(assetNFT, "AIAssistedTransfer").withArgs(user1.address, user2.address, tokenId, riskScore);

    expect(await assetNFT.ownerOf(tokenId)).to.equal(user2.address);
  });

  // ── Test 2 — Fake Signature ──────────────────────────────────────
  it("Test 2: should revert when signature is forged or corrupted", async function () {
    const { assetNFT, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const fakeSignature = "0x" + "aa".repeat(65);

    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, deadline, fakeSignature)
    ).to.revert(ethers);
  });

  // ── Test 3 — Wrong Token ─────────────────────────────────────────
  it("Test 3: should revert if signature was signed for token 1 but applied to token 2", async function () {
    const { assetNFT, user1, user2, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const signedTokenId = 1n;
    const attemptedTokenId = 2n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(signedTokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Signed specifically for token 1
    const signature = await helperSign(aiValidator, user1.address, user2.address, signedTokenId, riskScore, nonce, deadline);

    // User attempts to apply it to token 2 (which user1 also owns)
    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, attemptedTokenId, riskScore, deadline, signature)
    ).to.be.revertedWithCustomError(assetNFT, "InvalidAISignature");
  });

  // ── Test 4 — Wrong Recipient ─────────────────────────────────────
  it("Test 4: should revert if signature was created for user2 but transferred to attacker", async function () {
    const { assetNFT, user1, user2, attacker, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(tokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Signed for user2
    const signature = await helperSign(aiValidator, user1.address, user2.address, tokenId, riskScore, nonce, deadline);

    // Attempted transfer to attacker
    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, attacker.address, tokenId, riskScore, deadline, signature)
    ).to.be.revertedWithCustomError(assetNFT, "InvalidAISignature");
  });

  // ── Test 5 — Wrong Sender ────────────────────────────────────────
  it("Test 5: should revert if signature was created for user1 but called for attacker", async function () {
    const { assetNFT, user1, user2, attacker, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(tokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Signed for user1 -> user2
    const signature = await helperSign(aiValidator, user1.address, user2.address, tokenId, riskScore, nonce, deadline);

    // Attempted transfer claiming to be from attacker
    await expect(
      assetNFT.connect(attacker).transferWithAIPermit(attacker.address, user2.address, tokenId, riskScore, deadline, signature)
    ).to.be.revertedWithCustomError(assetNFT, "NotTokenOwner");
  });

  // ── Test 6 — Expired Authorization ───────────────────────────────
  it("Test 6: should revert when authorization deadline is expired", async function () {
    const { assetNFT, user1, user2, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(tokenId);
    const expiredDeadline = (await networkHelpers.time.latest()) - 100;

    const signature = await helperSign(aiValidator, user1.address, user2.address, tokenId, riskScore, nonce, expiredDeadline);

    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, expiredDeadline, signature)
    ).to.be.revertedWithCustomError(assetNFT, "AuthorizationExpired");
  });

  // ── Test 7 — Replay Attack Prevention ─────────────────────────────
  it("Test 7: should revert on replay of an already-used authorization signature", async function () {
    const { assetNFT, user1, user2, aiValidator, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(tokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const signature = await helperSign(aiValidator, user1.address, user2.address, tokenId, riskScore, nonce, deadline);

    // First use: SUCCESS
    await assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, deadline, signature);
    expect(await assetNFT.ownerOf(tokenId)).to.equal(user2.address);

    // Replay attempt with same signature: REVERT
    await expect(
      assetNFT.connect(user2).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, deadline, signature)
    ).to.revert(ethers);
  });

  // ── Test 8 — Unauthorized Signer ─────────────────────────────────
  it("Test 8: should revert if signature was signed by an unauthorized key", async function () {
    const { assetNFT, user1, user2, attacker, helperSign } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;
    const riskScore = 25;
    const nonce = await assetNFT.nonces(tokenId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Attacker signs instead of aiValidator
    const unauthorizedSignature = await helperSign(attacker, user1.address, user2.address, tokenId, riskScore, nonce, deadline);

    await expect(
      assetNFT.connect(user1).transferWithAIPermit(user1.address, user2.address, tokenId, riskScore, deadline, unauthorizedSignature)
    ).to.be.revertedWithCustomError(assetNFT, "InvalidAISignature");
  });

  // ── Test 9 — Approval RBAC & Validator Update ────────────────────
  it("Test 9: should enforce RBAC on updating AI validator (non-admin reverts, admin succeeds)", async function () {
    const { assetNFT, admin, user1, attacker } = await networkHelpers.loadFixture(deployFixture);

    // Non-admin attempts to set AI validator
    await expect(
      assetNFT.connect(user1).setAIValidator(attacker.address)
    ).to.be.revertedWithCustomError(assetNFT, "Unauthorized");

    // Admin sets new validator
    await expect(
      assetNFT.connect(admin).setAIValidator(attacker.address)
    ).to.emit(assetNFT, "AIValidatorUpdated").withArgs(await assetNFT.aiValidator(), attacker.address);

    expect(await assetNFT.aiValidator()).to.equal(attacker.address);
  });

  // ── Test 10 — Direct Contract Bypass Prevention ──────────────────
  it("Test 10: should strictly revert when a user attempts a direct transferFrom bypass without AI permit", async function () {
    const { assetNFT, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

    const tokenId = 1n;

    // Direct invocation of standard transferFrom without valid AI permit
    await expect(
      assetNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId)
    ).to.be.revertedWithCustomError(assetNFT, "DirectTransferNotAllowed");
  });
});
