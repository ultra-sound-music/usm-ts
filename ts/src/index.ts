import { TOKEN_PROGRAM_ID, MintLayout, u64 } from "@solana/spl-token";
import { Auction } from '@metaplex-foundation/mpl-auction';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Account } from '@metaplex-foundation/mpl-core';
import { RedeemBid } from "@metaplex-foundation/mpl-metaplex";
import { Connection, Wallet } from '@metaplex/js';
import { PublicKey } from "@solana/web3.js";
import { actions } from '@metaplex/js';
import { placeBid, cancelBid } from "./utils/utils";
import BN from 'bn.js';
const { claimBid, redeemFullRightsTransferBid} = actions;


export class USMClient{
  connection;
  wallet;

    //TODO: sweep funds to admin wallet


  constructor(connection: Connection, wallet: Wallet){
    this.connection = connection;
    this.wallet= wallet;
  }

  async getAuction(pubKey: PublicKey){
    return Auction.load(this.connection, pubKey);
  }

  async placeBid(amount: BN, auction: PublicKey){
    return placeBid({
      connection: this.connection, 
      wallet: this.wallet, 
      amount, 
      auction, 
    })
  }

  async claimBid(store: PublicKey, auction: PublicKey, bidderPotToken?:PublicKey){

    return claimBid({
      connection: this.connection, 
      wallet: this.wallet,
      store, 
      auction,
      bidderPotToken
    })
  }

  async cancelBid(auction: PublicKey){

    return cancelBid({
      connection: this.connection,
      wallet: this.wallet,
      auction
    })
  }

  //TODO: implement

  async refundBid(){


  }

  async redeemBid(store: PublicKey, auction: PublicKey){
    return redeemFullRightsTransferBid({
      connection: this.connection,
      wallet: this.wallet,
      store,
      auction
    })
  }

  async getMint(tokenMint: PublicKey){
    const info = await this.connection.getAccountInfo(tokenMint);
    if (info === null) {
      throw new Error('Failed to find mint account');
    }
    if (!info.owner.equals(TOKEN_PROGRAM_ID)) {
      throw new Error(`Invalid mint owner: ${JSON.stringify(info.owner)}`);
    }
    if (info.data.length != MintLayout.span) {
      throw new Error(`Invalid mint size`);
    }

    const data = Buffer.from(info.data);
    const mintInfo = MintLayout.decode(data);

    if (mintInfo.mintAuthorityOption === 0) {
      mintInfo.mintAuthority = null;
    } else {
      mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority);
    }

    mintInfo.supply = u64.fromBuffer(mintInfo.supply);
    mintInfo.isInitialized = mintInfo.isInitialized != 0;

    if (mintInfo.freezeAuthorityOption === 0) {
      mintInfo.freezeAuthority = null;
    } else {
      mintInfo.freezeAuthority = new PublicKey(mintInfo.freezeAuthority);
    }
    return mintInfo;

  }

  async getMetadata(tokenMint: PublicKey){
    const metadata = await Metadata.getPDA(tokenMint);
    const metadataInfo = await Account.getInfo(this.connection, metadata);
    const { data } = new Metadata(metadata, metadataInfo).data;
    return data;
  }

}




 