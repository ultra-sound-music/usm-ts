#! /usr/bin/env node

import * as web3 from '@solana/web3.js';
import BN from 'bn.js';
import { NATIVE_MINT, Token, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import { NodeWallet, actions } from '@metaplex/js';
const {initStoreV2, createExternalPriceAccount, createVault, initAuction, addTokensToVault} = actions;
const { Connection, clusterApiUrl, PublicKey, Keypair } = web3;
import { loadKeypair } from "./utils/utils"

import {  
  Auction, 
  WinnerLimit, 
  WinnerLimitType,
  PriceFloor,
  PriceFloorType
} from '@metaplex-foundation/mpl-auction';


import { program } from 'commander';
import { MintNFTParams } from '@metaplex/js/lib/actions';
program.version('1.0.0');


program
    .command('init-store')
    .option(
        '-e, --env <string>',
        'Solana cluster env name',
        'devnet',
    )
    .requiredOption(
        '-k, --keypair <path>',
        `Solana wallet location`,
        '--keypair not provided',
    )
    .action(async (options) => {

        // get values from options

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))

        const result = await initStoreV2({connection, wallet, settingsUri: null, isPublic: false })
        console.log(result)
    
    })

program
    .command('create-vault')
    .option(
        '-e, --env <string>',
        'Solana cluster env name',
        'devnet',
    )
    .requiredOption(
        '-k, --keypair <path>',
        `Solana wallet location`,
        '--keypair not provided',
    )
    .action(async (options) => {

        // get values from options

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))

        const {txId, externalPriceAccount, priceMint} = await createExternalPriceAccount({connection, wallet})

        // await createExternalPriceAccount to succeed before creating vault
        await connection.confirmTransaction(txId);
        const {vault} = await createVault({connection, wallet, externalPriceAccount, priceMint})
        console.log("vault created successfully", vault.toBase58())
    
    })

    program
    .command('mint-nft')
    .argument('<uri>', 'metadata uri')
    .argument('<vault>', 'vault pub key')
    .option(
        '-e, --env <string>',
        'Solana cluster env name',
        'devnet',
    )
    .requiredOption(
        '-k, --keypair <path>',
        `Solana wallet location`,
        '--keypair not provided',
    )
    .action(async (uri, vault, options) => {

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))
        const {payer} = wallet;

        const nft = await Token.createMint(connection, payer, payer.publicKey, payer.publicKey, 0, TOKEN_PROGRAM_ID)
        const dest = await nft.createAssociatedTokenAccount(payer.publicKey);
        await nft.mintTo(dest, payer.publicKey, [payer], 1)

        await addTokensToVault({
            connection, wallet, vault: new PublicKey(vault), nfts: [{tokenAccount: dest, tokenMint: nft.publicKey, amount: new BN(1)}] })
        console.log(nft.publicKey)

        console.log("nft created and added to vault", nft.publicKey.toBase58())
    })


    program
    .command('init-auction')
    .argument('<resource>', 'resource to auction')
    .option(
        '-e, --env <string>',
        'Solana cluster env name',
        'devnet',
    )
    .requiredOption(
        '-k, --keypair <path>',
        `Solana wallet location`,
        '--keypair not provided',
    )
    .action(async (resource, options) => {

        // get values from options

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))

        const externalPriceAccountData = await createExternalPriceAccount({ connection, wallet });

        await connection.confirmTransaction(externalPriceAccountData.txId);


        const {txId, vault } = await createVault({
          connection,
          wallet,
          ...externalPriceAccountData,
        });

        await connection.confirmTransaction(txId);

        const auctionSettings = {
          instruction: 1,
          tickSize: null,
          auctionGap: null,
          endAuctionAt: null,
          resource: new PublicKey(resource),
          gapTickSizePercentage: null,
          winners: new WinnerLimit({
            type: WinnerLimitType.Capped,
            usize: new BN(1),
          }),
          tokenMint: NATIVE_MINT.toBase58(),
          priceFloor: new PriceFloor({ type: PriceFloorType.Minimum }),
        };

        const auctionData = await initAuction({
          connection,
          wallet,
          vault,
          auctionSettings,
        });

        await connection.confirmTransaction(auctionData.txId);
        const auctionInstance = await Auction.load(connection, auctionData.auction);
        console.log("auction created at", auctionInstance.pubkey.toBase58())
    
    })



program.parse(process.argv);
