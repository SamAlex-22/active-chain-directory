import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const { ethers } = await network.create();
  console.log("Starting deployment...");

  // 1. Get Signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // 2. Deploy RoleManager
  const roleManager = await ethers.deployContract("RoleManager");
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  console.log(`RoleManager deployed to: ${roleManagerAddress}`);

  // 3. Deploy IdentityRegistry
  const identityRegistry = await ethers.deployContract("IdentityRegistry", [roleManagerAddress]);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log(`IdentityRegistry deployed to: ${identityRegistryAddress}`);

  // 4. Deploy AuditRegistry
  const auditRegistry = await ethers.deployContract("AuditRegistry");
  await auditRegistry.waitForDeployment();
  const auditRegistryAddress = await auditRegistry.getAddress();
  console.log(`AuditRegistry deployed to: ${auditRegistryAddress}`);

  // 5. Deploy AssetNFT
  const assetNFT = await ethers.deployContract("AssetNFT", [
    roleManagerAddress,
    auditRegistryAddress
  ]);
  await assetNFT.waitForDeployment();
  const assetNFTAddress = await assetNFT.getAddress();
  console.log(`AssetNFT deployed to: ${assetNFTAddress}`);

  // 6. Frontend Export
  // Resolve the path relative to the hardhat project root (process.cwd())
  const frontendDir = path.resolve(process.cwd(), "frontend/src/contracts");

  // Create the frontend directory if it doesn't exist
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
    console.log(`\nCreated frontend directory at: ${frontendDir}`);
  }

  // Write contract addresses to contract-config.json
  const configPath = path.join(frontendDir, "contract-config.json");
  const contractAddresses = {
    RoleManager: roleManagerAddress,
    IdentityRegistry: identityRegistryAddress,
    AuditRegistry: auditRegistryAddress,
    AssetNFT: assetNFTAddress
  };
  fs.writeFileSync(configPath, JSON.stringify(contractAddresses, null, 2));
  console.log(`Contract addresses exported to: ${configPath}`);

  // Helper function to copy ABI JSON files
  const copyABI = (contractName: string) => {
    // Hardhat artifacts structure: artifacts/contracts/<ContractName>.sol/<ContractName>.json
    const abiSourcePath = path.resolve(process.cwd(), `artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const abiDestPath = path.join(frontendDir, `${contractName}.json`);
    
    if (fs.existsSync(abiSourcePath)) {
      const artifact = JSON.parse(fs.readFileSync(abiSourcePath, "utf-8"));
      // We extract just the ABI array to keep the frontend config lightweight
      fs.writeFileSync(abiDestPath, JSON.stringify(artifact.abi, null, 2));
      console.log(`Exported ABI for ${contractName}`);
    } else {
      console.warn(`WARNING: Could not find artifact for ${contractName} at ${abiSourcePath}`);
    }
  };

  // Copy ABIs for all 4 core contracts
  copyABI("RoleManager");
  copyABI("IdentityRegistry");
  copyABI("AuditRegistry");
  copyABI("AssetNFT");
  
  console.log("\nDeployment and frontend export completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
