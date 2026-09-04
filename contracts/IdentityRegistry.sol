// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRoleManager.sol";

/**
 * @title IdentityRegistry
 * @dev Manages the IdentityProfile struct and checks IRoleManager before allowing identity creation.
 */
contract IdentityRegistry {
    struct IdentityProfile {
        bool isActive;
        uint256 registeredAt;
        string didUri;
    }

    mapping(address => IdentityProfile) private _identities;
    IRoleManager public roleManager;

    // Custom errors for cleaner reverts
    error Unauthorized();
    error IdentityAlreadyExists();
    error IdentityDoesNotExist();

    /**
     * @dev Sets the role manager interface.
     */
    constructor(address _roleManager) {
        roleManager = IRoleManager(_roleManager);
    }

    /**
     * @dev Modifier to restrict access to ADMIN_ROLE
     */
    modifier onlyAdmin() {
        if (!roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     * @dev Creates an identity profile. Restricted to ADMIN_ROLE.
     */
    function registerIdentity(address user, string memory didUri) external onlyAdmin {
        if (_identities[user].registeredAt != 0) {
            revert IdentityAlreadyExists();
        }

        _identities[user] = IdentityProfile({
            isActive: true,
            registeredAt: block.timestamp,
            didUri: didUri
        });
    }

    /**
     * @dev Deactivates an identity profile. Restricted to ADMIN_ROLE.
     */
    function deactivateIdentity(address user) external onlyAdmin {
        if (_identities[user].registeredAt == 0) {
            revert IdentityDoesNotExist();
        }
        _identities[user].isActive = false;
    }

    /**
     * @dev Returns the identity profile of a user.
     */
    function getIdentity(address user) external view returns (IdentityProfile memory) {
        return _identities[user];
    }
}
