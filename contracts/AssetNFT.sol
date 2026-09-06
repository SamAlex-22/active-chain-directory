// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IAuditRegistry.sol";

/**
 * @title AssetNFT
 * @dev ERC721 token registry with role management, event logging, and EIP-712 cryptographic AI transfer authorization.
 */
contract AssetNFT is ERC721, ERC721URIStorage, EIP712 {
    using ECDSA for bytes32;

    mapping(uint256 => string) public iotTagIds;
    mapping(uint256 => uint256) public nonces;
    
    IRoleManager public immutable roleManager;
    IAuditRegistry public immutable auditRegistry;
    address public aiValidator;

    uint256 private _nextTokenId;
    bool private _permittedTransferInProgress;

    bytes32 public constant AI_AUTHORIZATION_TYPEHASH = keccak256(
        "AIAuthorization(address from,address to,uint256 tokenId,uint256 riskScore,uint256 nonce,uint256 deadline)"
    );

    error Unauthorized();
    error NotTokenOwner();
    error InvalidRecipient();
    error InvalidAISignature();
    error AuthorizationExpired();
    error InvalidNonce();
    error RiskTooHigh(uint256 riskScore);
    error DirectTransferNotAllowed();

    event AIValidatorUpdated(address indexed oldValidator, address indexed newValidator);
    event AIAssistedTransfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 riskScore);

    constructor(
        address _roleManager,
        address _auditRegistry,
        address _aiValidator
    ) ERC721("Active Chain Asset", "ACA") EIP712("ActiveChainDirectory", "1") {
        roleManager = IRoleManager(_roleManager);
        auditRegistry = IAuditRegistry(_auditRegistry);
        aiValidator = _aiValidator;
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
     * @dev Sets a new trusted AI Validator address. Restricted to ADMIN_ROLE.
     */
    function setAIValidator(address _newValidator) external onlyAdmin {
        if (_newValidator == address(0)) revert Unauthorized();
        address oldValidator = aiValidator;
        aiValidator = _newValidator;
        emit AIValidatorUpdated(oldValidator, _newValidator);
        auditRegistry.logEvent("AI_VALIDATOR_UPDATED", msg.sender, 0, Strings.toHexString(_newValidator));
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
     * @dev Transfers token using cryptographically signed EIP-712 AI permit.
     * Prevents direct transfer bypass and verifies AI Validator signature, nonce, risk score, and deadline.
     */
    function transferWithAIPermit(
        address from,
        address to,
        uint256 tokenId,
        uint256 riskScore,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) {
            revert AuthorizationExpired();
        }
        if (riskScore > 69) {
            revert RiskTooHigh(riskScore);
        }
        if (ownerOf(tokenId) != from) {
            revert NotTokenOwner();
        }
        if (to == address(0)) {
            revert InvalidRecipient();
        }

        uint256 currentNonce = nonces[tokenId];

        bytes32 structHash = keccak256(
            abi.encode(
                AI_AUTHORIZATION_TYPEHASH,
                from,
                to,
                tokenId,
                riskScore,
                currentNonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);

        if (recoveredSigner != aiValidator || recoveredSigner == address(0)) {
            revert InvalidAISignature();
        }

        // Increment nonce to prevent replay
        nonces[tokenId] = currentNonce + 1;

        // Perform protected transfer
        _permittedTransferInProgress = true;
        _transfer(from, to, tokenId);
        _permittedTransferInProgress = false;

        emit AIAssistedTransfer(from, to, tokenId, riskScore);
        auditRegistry.logEvent(
            "AI_AUTHORIZED_TRANSFER",
            msg.sender,
            tokenId,
            string(abi.encodePacked("RiskScore:", Strings.toString(riskScore)))
        );
    }

    /**
     * @dev Overrides _update from ERC721.
     * Prevents direct contract bypass: transfers require an active AI permit unless invoked by ADMIN_ROLE.
     * Minting (from == address(0)) and burning (to == address(0)) remain unrestricted.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // If this is a token transfer (not minting or burning)
        if (from != address(0) && to != address(0)) {
            if (!_permittedTransferInProgress) {
                if (!roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender)) {
                    revert DirectTransferNotAllowed();
                }
            }
            auditRegistry.logEvent("ASSET_TRANSFERRED", auth != address(0) ? auth : msg.sender, tokenId, "");
        }
        
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
