#! /usr/bin/env node

import * as web3 from '@solana/web3.js';
import BN from 'bn.js';
import { NATIVE_MINT, Token, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import { NodeWallet, actions } from '@metaplex/js';
const {initStoreV2, createExternalPriceAccount, createVault, initAuction, addTokensToVault, mintNFT, closeVault} = actions;
const { Connection, clusterApiUrl, PublicKey,  sendAndConfirmTransaction } = web3;
import { loadKeypair, createMetadataUri, getOriginalLookupPDA } from "./utils/utils"

import {  
  Auction,
  SetAuctionAuthority,
  WinnerLimit, 
  WinnerLimitType,
  PriceFloor,
  PriceFloorType
} from '@metaplex-foundation/mpl-auction';
import {
    SetVaultAuthority,
    SafetyDepositBox,
  } from '@metaplex-foundation/mpl-token-vault';

  import {
    Store,
    WhitelistedCreator,
    SetWhitelistedCreator,
    AuctionManager,
    AuctionWinnerTokenTypeTracker,
    InitAuctionManagerV2,
    StartAuction,
    SafetyDepositConfig,
  } from '@metaplex-foundation/mpl-metaplex';

  import {
    MasterEdition,
    Metadata,
  } from '@metaplex-foundation/mpl-token-metadata';

  
  import { ValidateSafetyDepositBoxV2 } from './utils/validateSafetyDepositBoxV2';

  import { TupleNumericType, Transaction } from '@metaplex-foundation/mpl-core';


import { program } from 'commander';
import { AmountRange, SafetyDepositConfigData, WinningConfigType } from './utils/SafetyDepositConfig';
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

        const {storeId} = await initStoreV2({connection, wallet, settingsUri: null, isPublic: false })
        console.log("store initialized, id = ", storeId.toBase58())
    
    })
    
program
    .command('set-whitelist-creator')
    .argument('<store>', 'store id')
    .requiredOption(
        '-k, --keypair <path>',
        `Solana wallet location`,
        '--keypair not provided',
    )
    .option(
        '-e, --env <string>',
        'Solana cluster env name',
        'devnet',
    )
    .option(
        '-c, --creator <string>',
        'creator adddresss',
    )
    .action(async (store, options) => {

        // get values from options

        const { env, keypair, creator } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))
        const {payer} = wallet;
        const storeId = new PublicKey(store)

        const creatorPubKey = creator ? new PublicKey(creator) : payer.publicKey;

        const whitelistedCreatorPDA = await WhitelistedCreator.getPDA(storeId, creatorPubKey);

        const tx = new SetWhitelistedCreator(
            { feePayer: payer.publicKey },
            {
              admin: payer.publicKey,
              store: storeId,
              whitelistedCreatorPDA,
              creator: creatorPubKey,
              activated: true,
            },
          );
      
          const result = await sendAndConfirmTransaction(connection, tx, [payer, payer], {
            commitment: 'confirmed',
          });

        console.log(`creator ${creatorPubKey} white listed on store ${storeId}`)
        console.log(`tx id ${result}`)
    
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
        console.log("vault created successfully key = ", vault.toBase58())
        console.log("price mint = ", priceMint.toBase58())
    
    })

    program
        .command('create-metadata-uri')
        .requiredOption(
            '-ar, --arwallet <path>',
            'ar wallet path',
            '--arwallet not provided',
        )
        .requiredOption(
        '-m, --metadata <path>',
        `metadata json location`,
        '--metadata-path not provided',
        )
        .action(async (options) => {

            const {metadata, arwallet} = options;

            return createMetadataUri({arweaveWallet: arwallet, metadataPath: metadata })

    })

    program
    .command('mint-nft')
    .argument('<uri>', 'metadata uri')
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
    .action(async (uri, options) => {

        const { env, keypair } = options;


        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))
        const {payer} = wallet;

        const {txId, mint} = await mintNFT({connection, wallet, uri, maxSupply: 1})

        await connection.confirmTransaction(txId);

        console.log("nft created, pub key =", mint.toBase58())
    })

    program
    .command('add-nft-to-vault')
    .argument('<nft>', 'nft pub ke')
    .argument('<vault>', 'vault pub key')
    .argument('<price_mint>', 'price mint pub key')
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
    .action(async (nft, vault, price_mint, options) => {

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))
        const {payer} = wallet;

        const nftMint = new PublicKey(nft);
        const vaultPubKey = new PublicKey(vault);
        const priceMintPubKey = new PublicKey(price_mint);

        const nftToken = new Token(connection, nftMint, TOKEN_PROGRAM_ID, payer);

        const {address} = await nftToken.getOrCreateAssociatedAccountInfo(payer.publicKey);

        const {safetyDepositTokenStores} = await addTokensToVault({
            connection, wallet, vault: new PublicKey(vault), nfts: [{tokenAccount: address, tokenMint: nftMint, amount: new BN(1)}] })

        await closeVault({connection, wallet, vault: vaultPubKey, priceMint: priceMintPubKey})

        console.log("nft succesfully added to vault and vault state moved to combined, ready for init auction")
        console.log("Token store account = ,", safetyDepositTokenStores[0].tokenStoreAccount.toBase58())

    })

    
    program
    .command('init-auction')
    .argument('<vault>', 'auction vault')
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
    .action(async (vault, options) => {

        // get values from options

        const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))
        const vaultPubKey = new PublicKey(vault)

        const auctionSettings = {
          instruction: 1,
          tickSize: null,
          auctionGap: null,
          endAuctionAt: null,
          gapTickSizePercentage: null,
          resource: vaultPubKey,
          winners: new WinnerLimit({
            type: WinnerLimitType.Capped,
            usize: new BN(1),
          }),
          tokenMint: NATIVE_MINT.toBase58(),
          priceFloor: new PriceFloor({ type: PriceFloorType.Minimum }),
        };

        const {txId, auction} = await initAuction({connection, wallet, vault: vaultPubKey, auctionSettings})

        await connection.confirmTransaction(txId)

        const auctionInstance = await Auction.load(connection, auction);
        console.log("auction created at", auctionInstance.pubkey.toBase58())
    
    })

    program
        .command('init-auction-manager')
        .argument('<vault>', 'auction vault')
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
        .action(async (vault,options) => {

            const { env, keypair } = options;

        const connection = new Connection(clusterApiUrl(env))
        const wallet = new NodeWallet(loadKeypair(keypair))

        const {payer} = wallet
        const vaultPubKey = new PublicKey(vault)

        const storeId = await Store.getPDA(payer.publicKey);
        const auctionPDA = await Auction.getPDA(vaultPubKey);
        const auctionManagerPDA = await AuctionManager.getPDA(auctionPDA);
        const tokenTrackerPDA = await AuctionWinnerTokenTypeTracker.getPDA(auctionManagerPDA);

        const nativeMint = new Token(connection, NATIVE_MINT, TOKEN_PROGRAM_ID, payer);
        const paymentAccount = await nativeMint.createAccount(auctionManagerPDA);

        const initAuctionManagerTx = new InitAuctionManagerV2(
            { feePayer: payer.publicKey },
            {
                store: storeId,
                vault: vaultPubKey,
                auction: auctionPDA,
                auctionManager: auctionManagerPDA,
                auctionManagerAuthority: payer.publicKey,
                acceptPaymentAccount: paymentAccount,
                tokenTracker: tokenTrackerPDA,
                amountType: TupleNumericType.U8,
                lengthType: TupleNumericType.U8,
                maxRanges: new BN(10),
            },
        );

        const SetVaultAuthorityTx = new SetVaultAuthority(
            { feePayer: payer.publicKey },
            {
                vault: vaultPubKey,
                currentAuthority: payer.publicKey,
                newAuthority: auctionManagerPDA
            }
        )

        const txs = Transaction.fromCombined([initAuctionManagerTx ,SetVaultAuthorityTx ]);

        await sendAndConfirmTransaction(connection, txs, [payer, payer], {
            commitment: 'confirmed',
        });

        console.log("auction manager created at", auctionManagerPDA.toBase58(), "vault and auction authority transfered to auction manager")

    })

    program
        .command('validate-auction-manager')
        .argument('<vault>', 'auction vault')
        .argument('<nft>', 'nft mint')
        .argument('<token_store>', 'nft token store')
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
        .action(async (vault, mint, token_store, options) =>{
            const { env, keypair } = options;

            const connection = new Connection(clusterApiUrl(env))
            const wallet = new NodeWallet(loadKeypair(keypair))
            const {payer} = wallet;

            const mintPubKey = new PublicKey(mint);
            const vaultPubKey = new PublicKey(vault);
            const tokenStorePubKey = new PublicKey(token_store);


            const storeId = await Store.getPDA(payer.publicKey);
            const auctionPDA = await Auction.getPDA(vaultPubKey);
            const auctionManagerPDA = await AuctionManager.getPDA(auctionPDA);
            const tokenTrackerPDA = await AuctionWinnerTokenTypeTracker.getPDA(auctionManagerPDA);
            const metadataPDA = await Metadata.getPDA(mintPubKey);
            const editionPDA = await MasterEdition.getPDA(mintPubKey);
            const safetyDepositBox = await SafetyDepositBox.getPDA(vaultPubKey, mintPubKey);
            const safetyDepositConfig = await SafetyDepositConfig.getPDA(auctionManagerPDA,safetyDepositBox);
            const originalAuthorityLookup = await getOriginalLookupPDA(auctionPDA, metadataPDA);
            const whitelistedCreatorPDA = await WhitelistedCreator.getPDA(storeId, payer.publicKey);



            const safetyDepositConfigData = new SafetyDepositConfigData({
                auctionManager: auctionManagerPDA.toBase58(),
                order: new BN(0),
                winningConfigType: WinningConfigType.TokenOnlyTransfer,
                amountType: TupleNumericType.U8,
                lengthType: TupleNumericType.U8,
                amountRanges: [new AmountRange({amount: new BN(1), length: new BN(1)})],
                participationConfig: null,
                participationState: null
            })

                const tx = new ValidateSafetyDepositBoxV2(
                    {feePayer: payer.publicKey },
                    {   
                        store:storeId,
                        vault: vaultPubKey,
                        auctionManager: auctionManagerPDA,
                        auctionManagerAuthority: payer.publicKey,
                        metadataAuthority: payer.publicKey, 
                        originalAuthorityLookup,
                        tokenTracker: tokenTrackerPDA,
                        tokenAccount: metadataPDA,
                        tokenMint:mintPubKey,
                        edition: editionPDA,
                        whitelistedCreator: whitelistedCreatorPDA,
                        safetyDepositBox,
                        safetyDepositTokenStore: tokenStorePubKey,
                        safetyDepositConfig,
                        safetyDepositConfigData
                    }
                )

                await sendAndConfirmTransaction(connection, tx, [payer], {
                    commitment: 'confirmed',
                });
        })

    program
        .command('start-auction')
        .argument('<vault>', 'auction vault')
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
        .action(async (vault, options) => {

            const { env, keypair } = options;

            const connection = new Connection(clusterApiUrl(env))
            const wallet = new NodeWallet(loadKeypair(keypair))

            const {payer} = wallet
            const vaultPubKey = new PublicKey(vault)

            const storeId = await Store.getPDA(payer.publicKey);
            const auctionPDA = await Auction.getPDA(vaultPubKey);
            const auctionManagerPDA = await AuctionManager.getPDA(auctionPDA);

            const setAuctionAuthorityTx = new SetAuctionAuthority(
                { feePayer: payer.publicKey },
                {
                    auction: auctionPDA,
                    currentAuthority: payer.publicKey,
                    newAuthority: auctionManagerPDA
                }
            )

            await sendAndConfirmTransaction(connection, setAuctionAuthorityTx, [payer], {
                commitment: 'confirmed',
              });
        
            const tx = new StartAuction(
              { feePayer: payer.publicKey },
              {
                store: storeId,
                auction: auctionPDA,
                auctionManager: auctionManagerPDA,
                auctionManagerAuthority: payer.publicKey,
              },
            );
        
            await sendAndConfirmTransaction(connection, tx, [payer, payer], {
              commitment: 'confirmed',
            });

            console.log(`auction ${auctionPDA.toBase58()} has been started`)
        })



program.parse(process.argv);
