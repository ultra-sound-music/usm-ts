
import { NodeWallet } from "@metaplex/js";
import {web3, Provider, BN} from "@project-serum/anchor"
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { USMClient } from "../src";
import { AUCTION_PUBKEY, NFT_PUBKEY, TOKEN_MINT_PUBKEY} from "./utils";
const {Keypair} = web3;


describe('auction', () => {

  let provider;
  let connection;
  let wallet;
  let USM;

  before(async()=>{
    const walletKeypair = Keypair.generate()
    provider = new Provider(new Connection(clusterApiUrl('devnet')), new NodeWallet(walletKeypair), {});
    ({connection, wallet} = provider);
    await connection.confirmTransaction( await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL))
    USM = new USMClient(connection, wallet);
  })

  it("should load the auction", async ()=>{

    const auction = await USM.getAuction(AUCTION_PUBKEY);
    assert.strictEqual(AUCTION_PUBKEY.toBase58(), auction.pubkey.toBase58())


  })

  it("should place a bid on the auction", async ()=>{

    const bidAmount = new BN(6 * 10**8);
    const tx = await USM.placeBid(bidAmount, AUCTION_PUBKEY );

  })

  it("should claim bid on the auction", async ()=>{

    //const tx = await USM.claimBid(STORE_PUBKEY, AUCTION_PUBKEY );

  })

  it("should cancel bid on the auction", async ()=>{


    //TODOL nonsense test values, get real values
    /*const destAccount = Keypair.generate();
    const bidderPotToken = Keypair.generate();

    const tx = await USM.cancelBid(AUCTION_PUBKEY, destAccount.publicKey, bidderPotToken.publicKey );*/

  })

})