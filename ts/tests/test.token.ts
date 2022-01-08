
import { NodeWallet } from "@metaplex/js";
import {web3, Provider} from "@project-serum/anchor"
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { assert } from "chai";
import { USMClient } from "../src";
import { NFT_PUBKEY, TOKEN_MINT_PUBKEY} from "./utils";
const {Keypair} = web3;


describe('token', () => {

  let provider;
  let connection;
  let wallet;
  let USM;

  before(async()=>{
    const walletKeypair = Keypair.generate()
    provider = new Provider(new Connection(clusterApiUrl('devnet')), new NodeWallet(walletKeypair), {});
    ({connection, wallet} = provider);
    USM = new USMClient(connection, wallet);
  })

  it("should return info on a token mint", async() => {
    const mintInfo = await USM.getMint(TOKEN_MINT_PUBKEY);
    assert.strictEqual(mintInfo.decimals, 0);
  })

  it("should return nft metadata", async() => {
    const metadata = await USM.getMetadata(NFT_PUBKEY);
    assert.strictEqual(metadata.name, 'Pato');
  })

})