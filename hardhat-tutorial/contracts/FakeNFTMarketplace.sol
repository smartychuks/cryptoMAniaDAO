// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FakeNFTMarketplace{
    mapping(uint256 => address) public tokens;//mapping of NFT id to owner address
    uint256 nftPrice = 0.001 ether;//price of NFT

    //function to purchase the NFT for the DAO
    function purchase(uint256 _tokenId) external payable{
        require(msg.value == nftPrice, "This NFT costs 0.001 eth");
        tokens[_tokenId] = msg.sender;
        require(tokens[_tokenId] == address(0), "Sorry This Nft is not for sale");
    }

    //function that gets NFT price
    function getPrice() external view returns (uint256){
        return nftPrice;
    }

    //function to check if NFT is still available for sale
    function available(uint256 _tokenId) external view returns(bool){
        if(tokens[_tokenId] == address(0)){
            return true;
        }
        return false;
    }
}