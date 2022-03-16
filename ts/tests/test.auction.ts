
import { NodeWallet } from "@metaplex/js";
import {web3, Provider, BN} from "@project-serum/anchor"
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { USMClient } from "../src";
import { AUCTION_PUBKEY} from "./utils";
const {Keypair} = web3;


describe('auction', () => {

  let provider;
  let connection;
  let wallet;
  let USM: USMClient;

  before(async()=>{
    const walletKeypair = Keypair.generate()
    provider = new Provider(new Connection(clusterApiUrl('devnet')), new NodeWallet(walletKeypair), {});
    ({connection, wallet} = provider);
    await connection.confirmTransaction( await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL))
    USM = new USMClient('devnet', wallet);
    USM.connection = connection;
  })


  it("should load the auction", async ()=>{
    const auction = await USM.getAuction(AUCTION_PUBKEY);
    assert.strictEqual(AUCTION_PUBKEY.toBase58(), auction.pubkey.toBase58())
  })

  it("should get the auction data", async ()=>{
    const auctionData = await USM.getAuctionData(AUCTION_PUBKEY);
    assert.strictEqual(AUCTION_PUBKEY.toBase58(), auctionData.pubkey.toBase58())
  })

  it("should place a bid on the auction", async ()=>{
    const { confirmTransaction } = await USM.placeBid(1, AUCTION_PUBKEY);
    await confirmTransaction();
  })

  it("should cancel a bid on the auction", async ()=>{
    const { confirmTransaction } = await USM.cancelBid(AUCTION_PUBKEY);
    await confirmTransaction();
  })

  it("should claim bid on the auction", async ()=>{
    //this can only be tested when auction has ended
    //const tx = await USM.claimBid(STORE_PUBKEY, AUCTION_PUBKEY );

  })
})