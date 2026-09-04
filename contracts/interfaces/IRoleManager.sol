// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRoleManager
 * @dev Interface for Role Management to ensure loose coupling.
 */
interface IRoleManager {
    function ADMIN_ROLE() external view returns (bytes32);
    function MANAGER_ROLE() external view returns (bytes32);
    function AUDITOR_ROLE() external view returns (bytes32);
    function USER_ROLE() external view returns (bytes32);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);
}
