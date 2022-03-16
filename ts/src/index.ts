import { TOKEN_PROGRAM_ID, MintLayout, u64 } from "@solana/spl-token";
import { Auction } from '@metaplex-foundation/mpl-auction';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Account } from '@metaplex-foundation/mpl-core';
import { Connection, Wallet } from '@metaplex/js';
import { clusterApiUrl, LAMPORTS_PER_SOL, Cluster, PublicKey, TransactionSignature, Commitment } from "@solana/web3.js";
import { actions } from '@metaplex/js';
import { cancelBid, transformAuctionData, placeBid, USMAuctionData } from "./utils/utils";
import BN from 'bn.js';

export * from './utils/utils';
export {
  PublicKey
}

const { redeemFullRightsTransferBid, redeemParticipationBidV3 } = actions;

interface IRedeemParticipationBidV3Response {
  txIds: TransactionSignature[];
}

interface IRedeemBidResponse {
  txId: string;
}

export type IConfirmTransactionResult = Awaited<ReturnType<Connection['confirmTransaction']>>

export interface IBidMutationResponse {
  result: IRedeemBidResponse | IRedeemParticipationBidV3Response,
  confirmTransaction(): Promise<IConfirmTransactionResult> | Promise<PromiseSettledResult<IConfirmTransactionResult>[]>
}

export type IRpcEndpoint = Cluster | string;
export type IConnectionConfig = {
  rpcEndpoint: IRpcEndpoint;
  commitment?: Commitment
}

export type IConnectionConfigOrEndpoint = IRpcEndpoint | IConnectionConfig;

export function createRpcConnection(config: IConnectionConfigOrEndpoint): Connection {
  const {
    rpcEndpoint,
    commitment = 'processed'
  }: IConnectionConfig = typeof config === 'string' ? { rpcEndpoint: config } : config;
  const endpoint = rpcEndpoint?.startsWith('http') ? rpcEndpoint : clusterApiUrl(rpcEndpoint as Cluster);
  return new Connection(endpoint, commitment);
}

export class USMClient{
  connection: Connection;
  wallet: Wallet;

  constructor(connectionConfig: IConnectionConfigOrEndpoint, wallet: Wallet){
    this.connection = createRpcConnection(connectionConfig);
    this.wallet= wallet;
  }

  async getWalletBalance() {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getAuction(pubKey: PublicKey){
    return Auction.load(this.connection, pubKey);
  }

  async getAuctionData(pubKey: PublicKey){
    const a = await Auction.load(this.connection, pubKey);

    // @TODO - Get Transaction ID for each bid
    // @TODO - Get NFT + Metadata
    // Examples for getting all this other information can be found in:
    // metaplex/js/packages/web/src/views/auction/index.tsx
    // metaplex/js/packages/web/src/hooks/useAuctions.ts -> AuctionView (an amalgamation of various data sources)
    return transformAuctionData(a, this.connection);
  }

  async placeBid(amountInSol: number, auction: PublicKey){
    // @TODO - validate the amount (take tick size, tick size during ending phase, and time gap into account)
    // throw error if invalid bid

    const amount = new BN(amountInSol * LAMPORTS_PER_SOL);
    const result = await placeBid({
      connection: this.connection, 
      wallet: this.wallet, 
      amount, 
      auction, 
    })

    return {
      result,
      confirmTransaction: async (commitment: Commitment = 'finalized') => this.connection.confirmTransaction(result.txId, commitment)
    };
  }

  async cancelBid(auction: PublicKey){
    const result = await cancelBid({
      connection: this.connection,
      wallet: this.wallet,
      auction
    })

    return { 
      result,
      confirmTransaction: async (commitment: Commitment = 'finalized') => this.connection.confirmTransaction(result.txId, commitment)
    }

  }

  async redeemParticipationBid(store: PublicKey, auction: PublicKey): Promise<IBidMutationResponse>{
    const result = await redeemParticipationBidV3({
      connection: this.connection,
      wallet: this.wallet,
      store,
      auction
    })

    return {
      result,
      confirmTransaction: async (commitment: Commitment = 'finalized') => {
        return Promise.allSettled([
          this.connection.confirmTransaction(result.txIds[0], commitment),
          this.connection.confirmTransaction(result.txIds[1], commitment)
        ]);
      }
    }
  }

  async redeemBid(store: PublicKey, auction: PublicKey): Promise<IBidMutationResponse>{
    const result = await redeemFullRightsTransferBid({
      connection: this.connection,
      wallet: this.wallet,
      store,
      auction
    })

    return {
      result,
      confirmTransaction: async (commitment: Commitment = 'finalized') => this.connection.confirmTransaction(result.txId, commitment)
    }
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

export default USMClient;