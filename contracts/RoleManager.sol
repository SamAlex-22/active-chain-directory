// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRoleManager.sol";

/**
 * @title RoleManager
 * @dev Implements IRoleManager via OpenZeppelin AccessControl.
 * The DEFAULT_ADMIN_ROLE is granted to the deployer, which can later be transferred to a Gnosis Safe.
 */
contract RoleManager is AccessControl, IRoleManager {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    constructor() {
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles. This can later be transferred to a 
        // multisig like Gnosis Safe.
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Required override to resolve the multiple inheritance from AccessControl and IRoleManager
     */
    function hasRole(bytes32 role, address account) public view override(AccessControl, IRoleManager) returns (bool) {
        return super.hasRole(role, account);
    }
}
