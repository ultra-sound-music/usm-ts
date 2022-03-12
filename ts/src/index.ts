import { TOKEN_PROGRAM_ID, MintLayout, u64 } from "@solana/spl-token";
import { Auction } from '@metaplex-foundation/mpl-auction';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Account } from '@metaplex-foundation/mpl-core';
import { Connection, Wallet, } from '@metaplex/js';
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { actions } from '@metaplex/js';
import { cancelBid, transformAuctionData, placeBid } from "./utils/utils";
import BN from 'bn.js';
const { redeemFullRightsTransferBid, redeemParticipationBidV3 } = actions;

interface IRedeemParticipationBidV3Response {
  txIds: TransactionSignature[];
}

interface IRedeemBidResponse {
  txId: string;
}

export class USMClient{
  connection;
  wallet;

  constructor(connection: Connection, wallet: Wallet){
    this.connection = connection;
    this.wallet= wallet;
  }

  async getAuction(pubKey: PublicKey){
    return Auction.load(this.connection, pubKey);
  }

  async getAuctionData(pubKey: PublicKey){
    const a = await Auction.load(this.connection, pubKey);
    return transformAuctionData(a, this.connection);
  }

  async placeBid(amount: BN, auction: PublicKey){
    //place bid   
    const result = await placeBid({
      connection: this.connection, 
      wallet: this.wallet, 
      amount, 
      auction, 
    })
    // wait for tx to confirm
    await this.connection.confirmTransaction(result.txId);
    return result;
  }

  async cancelBid(auction: PublicKey){
    //cancel bid
    const result = await cancelBid({
      connection: this.connection,
      wallet: this.wallet,
      auction
    })
    //wait for tx to confirm
    await this.connection.confirmTransaction(result.txId);
    return result

  }

  async redeemParticipationBid(store: PublicKey, auction: PublicKey): Promise<IRedeemParticipationBidV3Response>{
    // redeem participation bid
    
    const result = await redeemParticipationBidV3({
      connection: this.connection,
      wallet: this.wallet,
      store,
      auction
    })
    // wait for both the initTx and mainTx to confirm

    this.connection.confirmTransaction(result.txIds[0])
    this.connection.confirmTransaction(result.txIds[1])
    return result;
     
  }

  async redeemBid(store: PublicKey, auction: PublicKey): Promise<IRedeemBidResponse>{
    const result = await redeemFullRightsTransferBid({
      connection: this.connection,
      wallet: this.wallet,
      store,
      auction
    })
    // wait for tx to confirm
    this.connection.confirmTransaction(result.txId);
    return result

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




 