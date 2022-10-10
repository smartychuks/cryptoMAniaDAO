const{ ethers } = require("hardhat");
const { CRYPTO_MANIA_NFT_CONTRACT } = require("../constants");

async function main(){
  const FakeNFTMArketplace = await ethers.getContractFactory('FakeNFTMarketplace');
  const fakeNFTMArketplace = await FakeNFTMArketplace.deploy();
  await fakeNFTMArketplace.deployed();
  console.log("FakeNFTMarketplace Contract address is: ", fakeNFTMArketplace.address);

  
  const CryptoManiaDAO = await ethers.getContractFactory("CryptoManiaDAO");
  const cryptoManiaDAO = await CryptoManiaDAO.deploy(
    fakeNFTMArketplace.address,
    CRYPTO_MANIA_NFT_CONTRACT,
    {
      value: ethers.utils.parseEther("0.005"),
    }
  );
  await cryptoManiaDAO.deployed();

  console.log("CryptoManiaDAO deployed to: ", cryptoManiaDAO.address);
}
main()
  .then(()=>process.exit(0))
  .catch((error)=>{
    console.error(error);
    process.exit(1)
  });