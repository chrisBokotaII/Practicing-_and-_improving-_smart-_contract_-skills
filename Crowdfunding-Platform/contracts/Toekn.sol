// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract FundRisingT is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    constructor(address initialOwner)
        ERC20("fundRising", "FR")
        Ownable(initialOwner)
        ERC20Permit("fundRising")
    {
        _mint(msg.sender, 18 * 10 ** decimals());
    }

    function safeMint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
