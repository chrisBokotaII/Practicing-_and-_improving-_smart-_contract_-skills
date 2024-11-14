// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DecentraLotto is VRFConsumerBaseV2, ReentrancyGuard, Ownable {
    using Math for uint256;

    VRFCoordinatorV2Interface private COORDINATOR;
    uint64 private s_subscriptionId;
    bytes32 private s_keyHash = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 private callbackGasLimit = 200000;
    uint16 private requestConfirmations = 3;
    uint32 private numWords = 2;

    uint256 public spotId;
    uint256 public ticketPrice = 0.1 ether;
    uint256 public duration = block.timestamp + 1 weeks;
    uint256 public winnerNumber;
    bool public gameActive;

    mapping(uint256 => address) public spotIdToAddress;
    mapping(address => uint256) public ticketCount;

    event NewTicket(address indexed player, uint256 indexed spotId);
    event Winner(address indexed winner, uint256 indexed spotId);
    event RequestedRandomness(uint256 indexed requestId);

    receive() external payable {}

    fallback() external payable {
        buyTicket();
    }

    function buyTicket() public payable nonReentrant {
        require(msg.value == ticketPrice, "Invalid ticket price");
        require(gameActive, "Game is not active");
         spotId++;
        spotIdToAddress[spotId] = msg.sender;
        ticketCount[msg.sender]++;
        emit NewTicket(msg.sender, spotId);
       
    }

    function chooseWinner() external onlyOwner returns (uint256 requestId) {
        require(gameActive, "Game is not active");
        require(spotId > 0, "No tickets sold");
        require( duration < block.timestamp, " still time to buy ticket");

        gameActive = false; // Stop the game from accepting new tickets
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        emit RequestedRandomness(requestId);
    }

   function fulfillRandomWords(uint256, uint256[] memory randomness) internal override {
    require(!gameActive, "Game still active");
    require(randomness.length > 0, "Randomness not generated");
    require(spotId > 0, "No one bought a ticket");

    uint256 winnerIndex = randomness[0] % spotId; 
    winnerNumber = winnerIndex;

    address winner = spotIdToAddress[winnerIndex];
    sendMoney(payable(winner));
    emit Winner(winner, winnerIndex);
}


    function sendMoney(address payable _winner) internal nonReentrant {
        require(!gameActive, "Game is still active");
        require(winnerNumber != 0 || _winner != address(0), "No winner yet"); 
        uint256 balance = address(this).balance ;
        require(balance > 0, "No funds to send");
        uint256 ServiceFees = address(this).balance * 5 / 100;
       
        _winner.transfer(balance - ServiceFees);
    }
    function ticketBought() external view returns (uint256) {
        return spotId;
    }
     function myTicket() external view returns (uint256) {
        return ticketCount[msg.sender];
    }

    constructor(uint64 _subscriptionId,address _vrfCoordinator) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        gameActive = true;
        spotId = 0;
    }
}
