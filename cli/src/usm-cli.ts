#! /usr/bin/env node

import * as web3 from '@solana/web3.js';
import { NodeWallet, actions } from '@metaplex/js';
const {initStoreV2, createExternalPriceAccount, createVault, initAuction} = actions;
const { Connection, clusterApiUrl, PublicKey, Keypair } = web3;
import { loadKeypair } from "./utils/utils"




import { program } from 'commander';
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
        const result = await createVault({connection, wallet, externalPriceAccount, priceMint})

        console.log(result)
    
    })


    program
    .command('init-auction')
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
        const result = await createVault({connection, wallet, externalPriceAccount, priceMint})

        console.log(result)
    
    })


program.parse(process.argv);
