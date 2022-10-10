import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {CRYPTOMANIA_DAO_ABI, CRYPTOMANIA_NFT_ABI, CRYPTOMANIA_NFT_CONTRACT_ADDRESS, CRYPTOMANIA_DAO_CONTRACT_ADDRESS,} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home(){
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [numProposals, setNumProposals] = useState("0");
  const [proposals, setProposals] = useState([]);
  const [nftBalance, setNftBalance] = useState(0);
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  const [selectedTab, setSelectedTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const web3modalRef = useRef();

  const connectWallet = async()=>{
    try{
      await getProviderOrsigner();
      setWalletConnected(true);
    }catch(err){
      console.error(err);
    }
  }

  const getDAOTreasuryBalance = async()=>{
    try{
      const provider = await getProviderOrsigner();
      const balance = await provider.getBalance(CRYPTOMANIA_DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    }catch(err){
      console.error(err);
    }
  }

  //to REad number of proposals in the DAO contract
  const getNumProposalsInDAO = async()=>{
    try{
      const provider = await getProviderOrsigner();
      const balance = await provider.getBalance(CRYPTOMANIA_DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    }catch(err){
      console.error(err);
    }
  }

  const getUserNFTBalance = async()=>{
    try{
      const signer = await getProviderOrsigner(true);
      const nftContract = getCryptoManiaNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    }catch(err){
      console.error(err);
    }
  }

  const createProposal = async()=>{
    try{
      const signer = await getProviderOrsigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    }catch(err){
      console.error(err);
      window.alert(err.data.message);
    }
  }

  // function to read proposal in contract
  const fetchProposalById = async(id) => {
    try{
      const provider = await getProviderOrsigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    }catch(err){
      console.error(err);
    }
  }

  const fetchAllProposals = async() =>{
    try{
      const proposals = [];
      for(let i = 0; i < numProposals; i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    }catch(err){
      console.error(err);
    }
  }

  const voteOnProposal = async(proposalId, _vote)=>{
    try{
      const signer = await getProviderOrsigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    }catch(error){
      console.error(error);
      window.alert(error.data.message);
    }
  }

  const executeProposal = async(proposalId)=>{
    try{
      const signer = await getProviderOrsigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    }catch(err){
      console.error(err);
      window.alert(err.data.message);
    }
  }

  const getProviderOrsigner = async(needsigner = false)=>{
    const provider = await web3modalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if(chainId !== 5){
      window.alert("Please switch to Goerli Network!");
      throw new Error("Please switch to Goerli Network");
    }

    if(needsigner){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }

  const getDaoContractInstance = (providerOrSigner)=>{
    return new Contract(
      CRYPTOMANIA_DAO_CONTRACT_ADDRESS,
      CRYPTOMANIA_DAO_ABI,
      providerOrSigner
    );
  }

  const getCryptoManiaNFTContractInstance = (providerOrSigner)=>{
    return new Contract(
      CRYPTOMANIA_NFT_CONTRACT_ADDRESS,
      CRYPTOMANIA_NFT_ABI,
      providerOrSigner
    );
  }

  useEffect(()=>{
    if(!walletConnected){
      web3modalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet().then(()=>{
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
      });
    }
  }, [walletConnected]);

  useEffect(()=>{
    if(selectedTab === "View Proposals"){
      fetchAllProposals(); 
    }
  },[selectedTab]);

  //function to render tabs based on user selection
  function renderTabs(){
    if(selectedTab === "Create Proposal"){
      return renderCreateProposalTab();
    }else if(selectedTab === "View Proposals"){
      return renderViewProposalTab();
    }
    return null;
  }

  // function used to render create proposal content
  function renderCreateProposalTab(){
    if(loading){
      return(
        <div className={styles.description}>
          Loading... waiting for transaction...
        </div>
      );
    }else if(nftBalance === 0){
      return(
        <div className={styles.description}>
          You do not have any Crypto Mania NFT in your wallet.<br />
          <b>You cannot create or vote on proposals</b>
        </div>
      )
    }else{
      return(
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input placeholder="0" type="number" 
          onChange={(e)=>setFakeNftTokenId(e.target.value)} />
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      );
    }
  }
  // function to view proposals content
  function renderViewProposalTab(){
    if(loading){
      return(
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    }else if(proposals.length === 0){
      return(
        <div className={styles.description}>There are no created Proposal yet, pls create one</div>
      );
    }else{
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "YAY")}
                  >
                    Vote YAY
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "NAY")}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>CryptoMania DAO</title>
        <meta name="description" content="CryptoMania DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Mania!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your CryptoMania NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}>
              Create Proposal
            </button>
            <button className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}>
              View Proposals
            </button>
          </div>
          {renderTabs()}
        </div>
        <div>
          <img className={styles.image} src="/cryptomania/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by iSmarty
      </footer>
    </div>
  );
}