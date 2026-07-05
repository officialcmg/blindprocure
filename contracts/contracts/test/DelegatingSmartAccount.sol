// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal contract-account harness for testing Zama user-decryption delegation.
contract DelegatingSmartAccount {
    address public immutable owner;

    error NotOwner();
    error CallFailed();

    constructor(address accountOwner) {
        owner = accountOwner;
    }

    function execute(address target, bytes calldata data) external returns (bytes memory result) {
        if (msg.sender != owner) revert NotOwner();

        bool success;
        (success, result) = target.call(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
}
