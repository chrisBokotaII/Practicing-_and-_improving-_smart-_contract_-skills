// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Uncomment this line to use console.log; comment it before deploying to production;
// import "hardhat/console.sol";
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);
    function safeMint(address to, uint256 amount) external;
}

contract FundRising is Ownable, ReentrancyGuard {
    uint public DurationTime;
    address payable public  beneficiary;
    uint256 public goal;
    uint256 public raised;
    uint256 public rewardRate;
    uint256 public constant MIN_DONATION = 0.5 ether; 
    bool public closed;
mapping(address => uint) public donorBalances;
mapping(address => bool) public rewardsClaimed;

address[]public donors;

    event donated(address indexed from, uint value, uint when);
    event FundsSentToBeneficiary(address indexed beneficiary, uint256 amount);
event RefundClaimed(address indexed donor, uint256 amount);
event RewardClaimed(address indexed donor, uint256 amount, address token);
modifier requireDurationPassed() {
    require(block.timestamp > DurationTime, "Time is not over");
    _;
}
modifier requireClosed(){
    require(closed == true, "not closed");
    _;
}
 constructor(uint _unlockTime, uint256 _goal, address payable _beneficiary, uint256 _rewardRate) Ownable(msg.sender) {
    require(block.timestamp < _unlockTime, "Unlock time should be in the future");
    require(_goal > 0, "Goal must be greater than 0");
    require(_beneficiary != address(0), "Invalid beneficiary address");
    require(_rewardRate > 0, "Reward rate must be greater than 0");

    DurationTime = _unlockTime;
    goal = _goal;
    beneficiary = _beneficiary;
    rewardRate = _rewardRate;  // Initialize reward rate
}
receive() external payable {
    donate(); 
}
 
    function donate() payable public {
        require(block.timestamp < DurationTime, "Time is over");

        require(msg.value > 0, "Donation amount must be greater than 0");
        require(msg.value >= MIN_DONATION, "Donation amount must be at least 0.5 ether");
        if(donorBalances[msg.sender] == 0){
          donors.push(msg.sender);   
        }
        donorBalances[msg.sender] += msg.value;
        raised += msg.value;
        
       
        emit donated(msg.sender, msg.value, block.timestamp);
    }
        function getAmountToReachGoal() public view returns (uint) {
            return goal - raised;
        }

        function close() public onlyOwner()  requireDurationPassed() {
            require(closed == false, "Already closed");
            closed = true;
        }

 function claimRefund() public requireDurationPassed() requireClosed() nonReentrant  {
    require(raised < goal, "Goal reached");
    uint refundAmount = donorBalances[msg.sender];
    require(refundAmount > 0, "No funds to refund");

    donorBalances[msg.sender] = 0;  // Update balance first
    payable(msg.sender).transfer(refundAmount);  // Send the refund

    emit RefundClaimed(msg.sender, refundAmount);
}

function emergencyWithdraw(uint amount) external onlyOwner requireClosed() nonReentrant {
    require(amount <= raised, "Not enough funds available");
    payable(owner()).transfer(amount);
}
        
     function sentToBeneficiary() public requireDurationPassed() requireClosed() onlyOwner() nonReentrant {
            require(raised >= goal, "Goal not reached");
            uint amount = raised;
            raised = 0;
            payable(beneficiary).transfer(amount);
            emit FundsSentToBeneficiary(beneficiary, amount);
        }

    function getBalance() public view returns (uint) {
        return donorBalances[msg.sender];
    }
   function claimReward(address _token) external requireClosed() nonReentrant {
    require(DurationTime < block.timestamp, "Time is not over");
    require(raised >= goal, "Goal not reached");

    require(!rewardsClaimed[msg.sender], "Reward already claimed");

    uint donorBalance = donorBalances[msg.sender];
    require(donorBalance > 0, "No donation made");

    uint tokenAmount = donorBalance * rewardRate;  // Calculate reward amount

    IERC20 token = IERC20(_token);
    require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");

    rewardsClaimed[msg.sender] = true;  // Mark reward as claimed

    emit RewardClaimed(msg.sender, tokenAmount, _token);
}

    function getRaised() public view returns (uint) {
        return raised;
    }

    function getGoal() public view returns (uint) {
        return goal;
    }

    function getDonors() public view returns (address[] memory) {
        return donors;
    }

    function getBeneficiary() public view returns (address) {
        return beneficiary;
    }
    function extendFundraising(uint newDuration) external onlyOwner {
    require(newDuration > block.timestamp, "New duration must be in the future");
    DurationTime = newDuration;
}
    fallback() external payable {
    donate();
}
}
