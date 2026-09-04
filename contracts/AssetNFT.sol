// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IAuditRegistry.sol";

/**
 * @title AssetNFT
 * @dev ERC721 token registry with role management via IRoleManager and event logging via IAuditRegistry.
 */
contract AssetNFT is ERC721, ERC721URIStorage {
    mapping(uint256 => string) public iotTagIds;
    
    IRoleManager public immutable roleManager;
    IAuditRegistry public immutable auditRegistry;

    uint256 private _nextTokenId;

    error Unauthorized();

    constructor(address _roleManager, address _auditRegistry) ERC721("Active Chain Asset", "ACA") {
        roleManager = IRoleManager(_roleManager);
        auditRegistry = IAuditRegistry(_auditRegistry);
        // Using 1-based indexing for token IDs makes 0 available as "not applicable" in logs
        _nextTokenId = 1;
    }

    /**
     * @dev Modifier to restrict access to ADMIN_ROLE or MANAGER_ROLE
     */
    modifier onlyAdminOrManager() {
        bool isAdmin = roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender);
        bool isManager = roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender);
        if (!isAdmin && !isManager) {
            revert Unauthorized();
        }
        _;
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
     * @dev Mints a new AssetNFT. Restricted to ADMIN_ROLE or MANAGER_ROLE.
     */
    function mintAsset(address to, string calldata _tokenURI, string calldata iotTagId) external onlyAdminOrManager {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        iotTagIds[tokenId] = iotTagId;
        
        auditRegistry.logEvent("ASSET_MINTED", msg.sender, tokenId, iotTagId);
    }

    /**
     * @dev Updates the URI of an existing token. Restricted to ADMIN_ROLE.
     */
    function updateTokenURI(uint256 tokenId, string calldata newTokenURI) external onlyAdmin {
        _setTokenURI(tokenId, newTokenURI);
        auditRegistry.logEvent("METADATA_UPDATED", msg.sender, tokenId, newTokenURI);
    }

    /**
     * @dev Overrides _update from ERC721 to log all transfers via IAuditRegistry.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // Log the transfer
        auditRegistry.logEvent("ASSET_TRANSFERRED", auth, tokenId, "");
        
        return from;
    }

    // Required overrides for ERC721URIStorage inheritance
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
