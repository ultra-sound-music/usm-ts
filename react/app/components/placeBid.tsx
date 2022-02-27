import { FC, useCallback, useState } from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import {USMClient} from "../../../ts/build/index"

interface Wallet {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}

export const AUCTION_PUBKEY = new PublicKey('2Uv4eWokSke21VcDVbjBysPZpxpQAr4vrwUob9viiS82');

const PlaceBid: FC = () => {
    const { connection } = useConnection();

    const wallet = useWallet() as Wallet;

    const USM = new USMClient(connection, wallet)

    const [bidAmount, setBidAmount] = useState(0)

    const handleInputChange = (e: any) => {
      const { name, value } = e.target;
      setBidAmount(value);
  };

    const onClickPlace = async (e: any) => {
       e.preventDefault();
       const bidInLamports = new BN(bidAmount * LAMPORTS_PER_SOL);
       const result = await USM.placeBid(bidInLamports, AUCTION_PUBKEY)
       console.log(result)
    };

    const onClickCancel = async (e: any) => {
      e.preventDefault();
     const result = await USM.cancelBid(AUCTION_PUBKEY)
      console.log(result)
   };


    return (
        <>

            <input 
            type="number" 
            id="bid"
            value={bidAmount}
            onChange={handleInputChange}
            
            />
            <button onClick={onClickPlace}>
                place bid
            </button>
            <br />
            <button onClick={onClickCancel}>
                cancel bid
            </button>
  
        </>

            

    );


}

export default PlaceBid