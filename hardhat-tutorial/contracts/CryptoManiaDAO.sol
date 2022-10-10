// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketPlace{
    function getPrice() external view returns (uint256);//funtion returns price of NFT in wei

    function available(uint256 _tokenId) external view returns (bool);

    function purchase(uint256 _tokenId) external payable;
}

interface ICryptoManiaNFT {
    //function reuturns balance of NFT owned by an address
    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

contract CryptoManiaDAO is Ownable {

    //struct containing information about any proposal
    struct Proposal {
        uint256 nftTokenId;
        uint256 deadline;
        uint256 yayVotes;
        uint256 nayVotes;
        bool executed;

        mapping(uint256 => bool) voters; //mapping crytoMania tokenId to indicate if NFT has been used to vote

    }

    //Mapping to stored all proposal id to proposal
    mapping(uint256 => Proposal) public proposals;
    uint256 public numProposals; //initialize number of proposals creates

    //reference variables for the contracts
    IFakeNFTMarketPlace nftMarketplace;
    ICryptoManiaNFT cryptoManiaNFT;

    //constructor to initialize the contract variables and also ETH deposit from deployer
    constructor(address _nftMarketplace, address _cryptoManiaNFT) payable {
        nftMarketplace = IFakeNFTMarketPlace(_nftMarketplace);
        cryptoManiaNFT = ICryptoManiaNFT(_cryptoManiaNFT);
    }

    //to only allow holders of CryptoMania NFT to use the DAO
    modifier nftHolderOnly(){
        require(cryptoManiaNFT.balanceOf(msg.sender) >0, "You are not a DAO member");
    _;
    }

    //fuction to create a proposal after being given the TokenID of NFT to be bought
    // returns id of the newly created proposal
    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns(uint256){
        require(nftMarketplace.available(_nftTokenId), "This NFT is not listed for sale");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;

        proposal.deadline = block.timestamp + 5 minutes;//set voing deadline to end in 5 minutes
        numProposals++;

        return numProposals - 1;
    }

    //modifier which requires that sction on any given proposal must be before deadline
    modifier activeProposalOnly(uint256 proposalIndex){
        require(proposals[proposalIndex].deadline > block.timestamp, "DEADLINE_EXCEEDED");
        _;
    }

    enum Vote{YAY, NAY}//Enum containing possible values for vote

    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = cryptoManiaNFT.balanceOf(msg.sender);
        uint256 numVotes;

        //loop to calcaulte number of NFT owned thats not use for vote yet
        for (uint256 i = 0; i < voterNFTBalance; ++i){
            uint256 tokenId = cryptoManiaNFT.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false){
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }
        require(numVotes > 0, "Already Voted");

        if(vote == Vote.YAY){
            proposal.yayVotes += numVotes;
        }else{
            proposal.nayVotes += numVotes;
        }
    }

    modifier inactiveProposalOnly(uint256 proposalIndex){
        require(proposals[proposalIndex].deadline <= block.timestamp, "Deadline not exceeded");
        require(proposals[proposalIndex].executed == false, "Proposal has already been executed");
        _;
    }

    // Function that eneables any CryptoMAnia NFT Holder to execute a proposal after deadline
    function excuteProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];

        if(proposal.yayVotes > proposal.nayVotes){
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "Not enought funds for the purchase");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;        
    }

    function withdrawEther() external onlyOwner{
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable{}
    fallback() external payable{}
}