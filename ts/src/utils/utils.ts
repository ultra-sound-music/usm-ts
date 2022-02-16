import BN from 'bn.js';
import { Commitment, Keypair, PublicKey, SystemProgram, TransactionSignature, sendAndConfirmTransaction} from '@solana/web3.js';
import { AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection } from '@metaplex/js';

import { NodeWallet } from '@metaplex/js';

import {
  AuctionProgram,
  AuctionExtended,
  BidderMetadata,
  BidderPot,
  PlaceBid,
} from '@metaplex-foundation/mpl-auction';

import { AuctionManager } from '@metaplex-foundation/mpl-metaplex';
import { actions,  transactions} from '@metaplex/js';
const { getCancelBidTransactions, createApproveTxs, createWrappedAccountTxs, sendTransaction} = actions;
const {CreateTokenAccount} = transactions;

import { Transaction } from '@metaplex-foundation/mpl-core';


const getBidderPotTokenPDA = async (bidderPotPubKey) =>{
  return AuctionProgram.findProgramAddress([
    Buffer.from(AuctionProgram.PREFIX),
    bidderPotPubKey.toBuffer(),
    Buffer.from('bidder_pot_token'),
  ]);

} 


interface TransactionsBatchParams {
  beforeTransactions?: Transaction[];
  transactions: Transaction[];
  afterTransactions?: Transaction[];
}

export class TransactionsBatch {
  beforeTransactions: Transaction[];
  transactions: Transaction[];
  afterTransactions: Transaction[];

  signers: Keypair[] = [];

  constructor({
    beforeTransactions = [],
    transactions,
    afterTransactions = [],
  }: TransactionsBatchParams) {
    this.beforeTransactions = beforeTransactions;
    this.transactions = transactions;
    this.afterTransactions = afterTransactions;
  }

  addSigner(signer: Keypair) {
    this.signers.push(signer);
  }

  addBeforeTransaction(transaction: Transaction) {
    this.beforeTransactions.push(transaction);
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  addAfterTransaction(transaction: Transaction) {
    this.afterTransactions.push(transaction);
  }

  toTransactions() {
    return [...this.beforeTransactions, ...this.transactions, ...this.afterTransactions];
  }

  toInstructions() {
    return this.toTransactions().flatMap((t) => t.instructions);
  }
}


/**
 * Parameters for {@link placeBid}s
 */
export interface PlaceBidParams {
  connection: Connection;
  /** The wallet from which tokens will be taken and transferred to the {@link bidderPotToken} account **/
  wallet: NodeWallet;
  /** The {@link Auction} program account address for the bid **/
  auction: PublicKey;
  /** Associated token account for the bidder pot **/
  bidderPotToken?: PublicKey;
  /** Amount of tokens (accounting for decimals) or lamports to bid. One important nuance to remember is that each token mint has a different amount of decimals, which need to be accounted while specifying the amount. For instance, to send 1 token with a 0 decimal mint you would provide `1` as the amount, but for a token mint with 6 decimals you would provide `1000000` as the amount to transfer one whole token **/
  amount: BN;
  commitment?: Commitment;
}

export interface PlaceBidResponse {
  txId: TransactionSignature;
  bidderPotToken: PublicKey;
  bidderMeta: PublicKey;
}

/**
 * Place a bid by taking it from the provided wallet and placing it in the bidder pot account.
 */
export const placeBid = async ({
  connection,
  wallet,
  amount,
  auction,
  bidderPotToken,
}: PlaceBidParams): Promise<PlaceBidResponse> => {
  const {payer} = wallet;
  const bidder = wallet.publicKey;
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  const auctionManager = await AuctionManager.getPDA(auction);
  const manager = await AuctionManager.load(connection, auctionManager);
  const {
    data: { tokenMint },
  } = await manager.getAuction(connection);
  const auctionTokenMint = new PublicKey(tokenMint);
  const vault = new PublicKey(manager.data.vault);
  const auctionExtended = await AuctionExtended.getPDA(vault);
  const bidderPot = await BidderPot.getPDA(auction, bidder);
  const bidderMeta = await BidderMetadata.getPDA(auction, bidder);
  ////

  let txBatch = new TransactionsBatch({ transactions: [] });

  if (bidderPotToken) {
    // cancel prev bid
    txBatch = await getCancelBidTransactions({
      destAccount: null,
      bidder,
      accountRentExempt,
      bidderPot,
      bidderPotToken,
      bidderMeta,
      auction,
      auctionExtended,
      auctionTokenMint,
      vault,
    });
    ////
  } else {
    // create a new account for bid
    bidderPotToken = await getBidderPotTokenPDA(bidderPot)
    ////
  }
  // create paying account
  const {
    account: payingAccount,
    createTokenAccountTx,
    closeTokenAccountTx,
  } = await createWrappedAccountTxs(connection, bidder, amount.toNumber() + accountRentExempt * 2);
  txBatch.addTransaction(createTokenAccountTx);
  txBatch.addSigner(payingAccount);
  ////

  // transfer authority
  const {
    authority: transferAuthority,
    createApproveTx,
    createRevokeTx,
  } = createApproveTxs({
    account: payingAccount.publicKey,
    owner: bidder,
    amount: amount.toNumber(),
  });
  txBatch.addTransaction(createApproveTx);
  txBatch.addAfterTransaction(createRevokeTx);
  txBatch.addAfterTransaction(closeTokenAccountTx);
  txBatch.addSigner(transferAuthority);
  ////

  // create place bid transaction
  const placeBidTransaction = new PlaceBid(
    { feePayer: bidder },
    {
      bidder,
      bidderToken: payingAccount.publicKey,
      bidderPot,
      bidderPotToken,
      bidderMeta,
      auction,
      auctionExtended,
      tokenMint: auctionTokenMint,
      transferAuthority: transferAuthority.publicKey,
      amount,
      resource: vault,
    },
  );
  txBatch.addTransaction(placeBidTransaction);
  ////

  const txId = await sendTransaction({
    connection,
    wallet,
    txs: txBatch.toTransactions(),
    signers: txBatch.signers,
  });

  return { txId, bidderPotToken, bidderMeta };
};