// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DirectoryRoleManager
 * @dev The core Web3 "Active Directory" assigning on-chain roles to user wallets (DIDs).
 */
contract DirectoryRoleManager is AccessControl {
    // Defining "Security Groups" exactly like traditional Active Directory
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    constructor() {
        // The wallet deploying this contract becomes the "Domain Admin"
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Hackathon Demo Helper: A quick way to verify if a user has manager rights
     */
    function isAssetManager(address user) public view returns (bool) {
        return hasRole(ASSET_MANAGER_ROLE, user);
    }
    
    // Note: OpenZeppelin automatically emits 'RoleGranted' and 'RoleRevoked' events 
    // which our AI Anomaly Engine will listen to off-chain later!
}
