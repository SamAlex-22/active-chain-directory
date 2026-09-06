import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("AssetNFT and AuditRegistry Integration", function () {
  async function deployFixture() {
    const [admin, manager, user1, user2, aiValidator] = await ethers.getSigners();

    const roleManager = await ethers.deployContract("RoleManager");
    const roleManagerAddress = await roleManager.getAddress();

    const auditRegistry = await ethers.deployContract("AuditRegistry");
    const auditRegistryAddress = await auditRegistry.getAddress();

    const assetNFT = await ethers.deployContract("AssetNFT", [
      roleManagerAddress,
      auditRegistryAddress,
      aiValidator.address
    ]);

    // Admin grants MANAGER_ROLE to the manager account
    const MANAGER_ROLE = await roleManager.MANAGER_ROLE();
    await roleManager.connect(admin).grantRole(MANAGER_ROLE, manager.address);

    return { roleManager, auditRegistry, assetNFT, admin, manager, user1, user2, aiValidator };
  }

  describe("Minting", function () {
    it("should allow manager to mint an asset and log ASSET_MINTED", async function () {
      const { assetNFT, auditRegistry, manager, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      const tokenURI = "ipfs://test-asset-uri";
      const iotTagId = "tag-12345";
      const expectedTokenId = 1n;

      const tx = await assetNFT.connect(manager).mintAsset(user1.address, tokenURI, iotTagId);
      
      expect(await assetNFT.balanceOf(user1.address)).to.equal(1n);

      await expect(tx)
        .to.emit(auditRegistry, "SystemLog")
        .withArgs("ASSET_MINTED", manager.address, expectedTokenId, iotTagId, (t: any) => true);
    });

    it("should revert if user1 attempts to mint an asset", async function () {
      const { assetNFT, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(
        assetNFT.connect(user1).mintAsset(user1.address, "uri", "tag")
      ).to.be.revertedWithCustomError(assetNFT, "Unauthorized");
    });
  });

  describe("Transfer & Audit Logging", function () {
    it("should log ASSET_TRANSFERRED when admin transfers an asset to user2", async function () {
      const { assetNFT, auditRegistry, manager, admin, user2 } = await networkHelpers.loadFixture(deployFixture);
      
      await assetNFT.connect(manager).mintAsset(admin.address, "uri", "tag");
      const expectedTokenId = 1n;

      const tx = await assetNFT.connect(admin).transferFrom(admin.address, user2.address, expectedTokenId);
      
      await expect(tx)
        .to.emit(auditRegistry, "SystemLog")
        .withArgs("ASSET_TRANSFERRED", admin.address, expectedTokenId, "", (t: any) => true);
    });
  });

  describe("Metadata Escape Hatch", function () {
    it("should allow admin to update token URI and log METADATA_UPDATED", async function () {
      const { assetNFT, auditRegistry, admin, manager, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await assetNFT.connect(manager).mintAsset(user1.address, "uri", "tag");
      const expectedTokenId = 1n;
      const newTokenURI = "ipfs://new-uri";

      const tx = await assetNFT.connect(admin).updateTokenURI(expectedTokenId, newTokenURI);

      expect(await assetNFT.tokenURI(expectedTokenId)).to.equal(newTokenURI);

      await expect(tx)
        .to.emit(auditRegistry, "SystemLog")
        .withArgs("METADATA_UPDATED", admin.address, expectedTokenId, newTokenURI, (t: any) => true);
    });

    it("should revert if manager or user1 tries to update token URI", async function () {
      const { assetNFT, manager, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await assetNFT.connect(manager).mintAsset(user1.address, "uri", "tag");
      const expectedTokenId = 1n;

      await expect(
        assetNFT.connect(manager).updateTokenURI(expectedTokenId, "new-uri")
      ).to.be.revertedWithCustomError(assetNFT, "Unauthorized");

      await expect(
        assetNFT.connect(user1).updateTokenURI(expectedTokenId, "new-uri")
      ).to.be.revertedWithCustomError(assetNFT, "Unauthorized");
    });
  });
});
