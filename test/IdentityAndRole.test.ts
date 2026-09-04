import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("Identity and Role Management", function () {
  async function deployFixture() {
    const [admin, manager, user] = await ethers.getSigners();

    const roleManager = await ethers.deployContract("RoleManager");
    const roleManagerAddress = await roleManager.getAddress();

    const identityRegistry = await ethers.deployContract("IdentityRegistry", [roleManagerAddress]);

    return { roleManager, identityRegistry, admin, manager, user };
  }

  describe("Deployment & Initialization", function () {
    it("should grant the admin both DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { roleManager, admin } = await networkHelpers.loadFixture(deployFixture);
      
      const defaultAdminRole = await roleManager.DEFAULT_ADMIN_ROLE();
      const adminRole = await roleManager.ADMIN_ROLE();

      expect(await roleManager.hasRole(defaultAdminRole, admin.address)).to.be.true;
      expect(await roleManager.hasRole(adminRole, admin.address)).to.be.true;
    });
  });

  describe("Identity Registration", function () {
    it("should allow admin to register an identity", async function () {
      const { identityRegistry, admin, user } = await networkHelpers.loadFixture(deployFixture);
      const didUri = "ipfs://mock-cid";
      
      await identityRegistry.connect(admin).registerIdentity(user.address, didUri);

      const identity = await identityRegistry.getIdentity(user.address);
      expect(identity.isActive).to.be.true;
      expect(identity.didUri).to.equal(didUri);
      expect(identity.registeredAt).to.be.greaterThan(0);
    });

    it("should revert if a non-admin tries to register an identity", async function () {
      const { identityRegistry, user } = await networkHelpers.loadFixture(deployFixture);
      const didUri = "ipfs://mock-cid";
      
      await expect(
        identityRegistry.connect(user).registerIdentity(user.address, didUri)
      ).to.be.revertedWithCustomError(identityRegistry, "Unauthorized");
    });
  });

  describe("Identity Deactivation", function () {
    it("should allow admin to deactivate an identity", async function () {
      const { identityRegistry, admin, user } = await networkHelpers.loadFixture(deployFixture);
      await identityRegistry.connect(admin).registerIdentity(user.address, "ipfs://mock-cid");
      
      await identityRegistry.connect(admin).deactivateIdentity(user.address);
      const identity = await identityRegistry.getIdentity(user.address);
      expect(identity.isActive).to.be.false;
    });

    it("should revert if a non-admin tries to deactivate an identity", async function () {
      const { identityRegistry, admin, user } = await networkHelpers.loadFixture(deployFixture);
      await identityRegistry.connect(admin).registerIdentity(user.address, "ipfs://mock-cid");
      
      await expect(
        identityRegistry.connect(user).deactivateIdentity(user.address)
      ).to.be.revertedWithCustomError(identityRegistry, "Unauthorized");
    });
  });
});
