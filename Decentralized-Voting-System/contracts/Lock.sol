// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

/**
 1. A proposal is made.
 2. Voters vote on the proposal.
 3. The proposal either passes or fails based on votes.
 4. If the proposal passes, the receiver can withdraw the funds.
 5. If the proposal fails, the receiver can't withdraw the funds.
 6. The owner can withdraw the funds after the unlock time.
 7. The owner can't withdraw the funds before the unlock time.
 */

contract Vote {
    uint256 public unlockTime;
    address payable public owner;
    
    struct Proposal {
        uint256 amount;
        uint256 voteCountfor;
        uint256 voteCountAgainst;

        bool pass;
        bool executed;
        address payable recipient;
        mapping(address => bool) voters;  // Track who has voted
    }


    Proposal[] public proposals;
    address[] public voters;
    mapping(address => bool) public isVoter;
    event ProposalCreated(uint256 proposalIndex, uint256 amount, address indexed recipient);
event Voted(uint256 proposalIndex, address indexed voter, bool vote);
event Passed(uint256 proposalIndex);
event failed(uint256 proposalIndex );
    modifier onlyVoter() {
        require(isVoter[msg.sender], "Not a registered voter");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }
    receive() external payable {}

    constructor(uint256 _unlockTime, address _owner, address[] memory _voters) {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");
        unlockTime = _unlockTime;
        owner = payable(_owner);

        // Add voters
        for (uint256 i = 0; i < _voters.length; i++) {
            require(_voters[i] != address(0), "Invalid voter address");
            require(_voters[i] != _owner, "Owner can't be a voter");
            voters.push(_voters[i]);
            isVoter[_voters[i]] = true;
        }
    }

    // Proposal creation by anyone
    function proposeAProposal(uint256 _amount, address payable _recipient) public returns (uint256) {
        require(_amount <= address(this).balance, "Insufficient contract balance for this proposal");
require(address(this).balance >= _amount, "Insufficient contract balance for this proposal");
        require(msg.sender == owner,"only onwer can propse");
        Proposal storage newProposal = proposals.push();
        newProposal.amount = _amount;
        newProposal.voteCountfor = 0;
        newProposal.voteCountAgainst = 0;
        newProposal.pass = false;
        newProposal.executed = false;
        newProposal.recipient = _recipient;
        emit ProposalCreated(proposals.length - 1, _amount, _recipient);

        return proposals.length - 1;
    }

    // Voting on a proposal
    function voteForProposal(uint256 _proposalIndex, bool _pass) public onlyVoter {
        require(_proposalIndex < proposals.length, "Invalid proposal index");
        Proposal storage proposal = proposals[_proposalIndex];
        require(!proposal.voters[msg.sender], "You have already voted for this proposal");
require(!proposal.executed, "Funds already withdrawn for this proposal");
        proposal.voters[msg.sender] = true;  // Mark that this voter has voted
        
        if (_pass) {
            proposal.voteCountfor += 1;
            // If majority votes pass, the proposal passes
        }else{
            proposal.voteCountAgainst+=1; 
        }
           emit Voted(_proposalIndex, msg.sender, _pass); 
     }

function publishProposal(uint256 _proposalIndex) public onlyOwner {
    require(_proposalIndex < proposals.length, "Invalid proposal index");
    require( block.timestamp >= unlockTime, "Funds are locked until unlock time");
    Proposal storage proposal = proposals[_proposalIndex];
    if(proposal.voteCountfor > proposal.voteCountAgainst) {
        proposal.pass = true;
        emit Passed(_proposalIndex);
    }else{
       proposal.pass=false ; 
       emit failed(_proposalIndex);
    }
}
   

    // Withdraw funds if the proposal passed
    function withdrawFunds(uint256 _proposalIndex) public {
    require( block.timestamp >= unlockTime, "Funds are locked until unlock time");
        require( block.timestamp >= unlockTime, "Funds are locked until unlock time");

        Proposal storage proposal = proposals[_proposalIndex];

        require(proposal.pass, "Proposal did not pass");
        require(!proposal.executed, "Funds already withdrawn for this proposal");
        require(proposal.recipient == msg.sender, "You are not the recipient of this proposal");

        proposal.executed = true;  // Mark proposal as executed
        proposal.recipient.transfer(proposal.amount);
    }

    // Owner withdraws funds after unlock time
    function withdrawByOwner( uint256 _proposalIndex) public onlyOwner {
        require(block.timestamp >= unlockTime, "Funds are locked until unlock time");
    require( block.timestamp >= unlockTime, "Funds are locked until unlock time");
   Proposal storage proposal = proposals[_proposalIndex];
   require(!proposal.pass,"proposal passed");
   require(!proposal.executed, "Funds already withdrawn for this proposal");
      proposal.executed = true;  // Mark proposal as executed
    }

    // Receive function to allow the contract to accept ETH

    // Get the total number of proposals
    function getProposalsCount() public view returns (uint256) {
        return proposals.length;
    }

    // Check if a voter has voted for a specific proposal
    function hasVoted(uint256 _proposalIndex, address _voter) public view returns (bool) {
        require(_proposalIndex < proposals.length, "Invalid proposal index");
        Proposal storage proposal = proposals[_proposalIndex];
        return proposal.voters[_voter];
    }
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    function getProposalDetails(uint256 _proposalIndex) external view returns (
        uint256 amount,
        uint256 voteCountfor,
        uint256 voteCountAgainst,
        bool pass,
        bool executed,
        address recipient
    ) {
        Proposal storage proposal = proposals[_proposalIndex];
        return (
            proposal.amount,
            proposal.voteCountfor,
            proposal.voteCountAgainst,
            proposal.pass,
            proposal.executed,
            proposal.recipient
        );
    }
    function getWhoVotedOnAproposal(uint256 _proposalIndex) external view returns (address[] memory) {
    Proposal storage proposal = proposals[_proposalIndex];

    // Create an array to store addresses of voters who voted
    address[] memory votedVoters = new address[](voters.length);
    uint256 count = 0;

    // Loop through all voters to check if they voted on the proposal
    for (uint256 i = 0; i < voters.length; i++) {
        if (proposal.voters[voters[i]]) {
            votedVoters[count] = voters[i];
            count++;
        }
    }

    // Create a new array with the exact size to return the voted voters
    address[] memory actualVoters = new address[](count);
    for (uint256 i = 0; i < count; i++) {
        actualVoters[i] = votedVoters[i];
    }

    return actualVoters;
}

}
