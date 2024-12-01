// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";



contract TokenVault is ERC4626 {
    mapping(address => uint256) public shareHolder;
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor(
        ERC20 _asset,
        string memory _name,
        string memory _symbol
    )  ERC4626(_asset) ERC20(_name,_symbol) {
    }

   
    function _deposit(uint _assets) external {
        require(_assets > 0, "Deposit less than Zero");
        deposit(_assets, msg.sender);
        shareHolder[msg.sender] += _assets;
        emit Deposit(msg.sender, _assets);
    }

   
    function _withdraw(uint _shares, address _receiver) external {
        require(_shares > 0, "withdraw must be greater than Zero");
        require(_receiver != address(0), "Zero Address");
        require(shareHolder[msg.sender] > 0, "Not a share holder");
        require(shareHolder[msg.sender] >= _shares, "Not enough shares");
        uint256 yield = (10 * _shares) / 100;
        uint256 assets = _shares + yield;
        redeem(assets, _receiver, msg.sender);
        shareHolder[msg.sender] -= _shares;
        emit Withdraw(msg.sender, _shares);
    }
     function totalAssetOfUser( address _user) external view returns (uint256) {
        return shareHolder[_user];
     }

    
}