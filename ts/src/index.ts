import { placeBid, claimBid, cancelBid } from "@metaplex/js/lib/actions";
import { TOKEN_PROGRAM_ID, MintLayout, u64 } from "@solana/spl-token";
import { Auction } from '@metaplex-foundation/mpl-auction';
import { PublicKey } from "@solana/web3.js";


export class USMClient{
  connection;
  wallet;

  constructor(connection, wallet){
    this.connection = connection;
    this.wallet= wallet;
  }

  async placeBid(amount, auction, bidderPotToken){
    await placeBid({
      connection: this.connection, 
      wallet: this.wallet, 
      amount, 
      auction, 
      bidderPotToken
    })
  }

  async claimBid(store, auction, bidderPotToken){
    await claimBid({
      connection: this.connection, 
      wallet: this.wallet,
      store, 
      auction,
      bidderPotToken
    })
  }

  async cancelBid(auction, bidderPotToken, destAccount){
    await cancelBid({
      connection: this.connection,
      wallet: this.wallet,
      auction,
      bidderPotToken,
      destAccount
    })
  }

  async getAuction(pubKey){
    return Auction.load(this.connection, pubKey);
  }

  async getMint(pubKey){
    const info = await this.connection.getAccountInfo(pubKey);
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

}




 