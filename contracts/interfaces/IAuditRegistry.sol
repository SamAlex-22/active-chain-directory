// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAuditRegistry
 * @dev Interface for centralized event logging.
 */
interface IAuditRegistry {
    /**
     * @dev Logs an event.
     * @param action The string identifier of the action.
     * @param actor The address that performed the action.
     * @param assetId The ID of the asset involved (can be 0 if not asset-related).
     * @param details Additional details of the action.
     */
    function logEvent(string calldata action, address actor, uint256 assetId, string calldata details) external;
}
