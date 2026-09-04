// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAuditRegistry.sol";

/**
 * @title AuditRegistry
 * @dev Centralized audit trail for all events, implementing IAuditRegistry.
 */
contract AuditRegistry is IAuditRegistry {
    event SystemLog(string action, address indexed actor, uint256 indexed assetId, string details, uint256 timestamp);

    /**
     * @dev Emits the SystemLog event utilizing block.timestamp.
     */
    function logEvent(string calldata action, address actor, uint256 assetId, string calldata details) external override {
        emit SystemLog(action, actor, assetId, details, block.timestamp);
    }
}
