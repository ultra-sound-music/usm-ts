import * as web3 from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

export const loadKeypair = (keypair) => {
    if (!keypair || keypair == '') {
        throw new Error('Keypair is required!');
    }
    const keypairPath = keypair.startsWith("~/") ? path.resolve(process.env.HOME, keypair.slice(2)) : path.resolve(keypair);
    const loaded = web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(keypairPath).toString())),
    );
    return loaded;
}