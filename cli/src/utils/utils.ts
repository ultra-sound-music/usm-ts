import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
import * as web3 from '@solana/web3.js';
import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';
import { MetaplexProgram } from '@metaplex-foundation/mpl-metaplex';

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

export const uploadImage = async ({arweaveWallet, imagePath}) => {

    // need to save prod key in .env variable 

    //const wallet = await arweave.wallets.generate();

    const host = "arweave.net";
    const port = "443";
    const protocol = "https";

    const arweave = Arweave.init({
      host,
      port,
      protocol,
      timeout: 20000,
  });

    const arPath = arweaveWallet.startsWith("~/") ? path.resolve(process.env.HOME, arweaveWallet.slice(2)) : path.resolve(arweaveWallet)

    const arWallet = JSON.parse(fs.readFileSync(arPath).toString())
    const address = await arweave.wallets.jwkToAddress(arWallet);
    const winston = await arweave.wallets.getBalance(address);

    console.log("ar address = ", address)
    console.log("ar balance winstons =", winston)


     // image to upload

    let data = fs.readFileSync(path.resolve(__dirname, imagePath));

    const imgTx = await arweave.createTransaction(
        {
            data,
        },
        arWallet,
    );
    imgTx.addTag('App-Name', 'dfs');
    imgTx.addTag('Content-Type', 'image/png');

    await arweave.transactions.sign(imgTx, arWallet);
    await arweave.transactions.post(imgTx);

    const imageUri = `${protocol}://${host}:${port}/${imgTx.id}`

    console.log("image uploaded successfully");
    console.log("image url =", imageUri)
}

export const createMetadataUri = async ({arweaveWallet, metadataPath}) => {

    // need to save prod key in .env variable 

    //const wallet = await arweave.wallets.generate();

    const host = "arweave.net";
    const port = "443";
    const protocol = "https";

    const arweave = Arweave.init({
      host,
      port,
      protocol,
      timeout: 20000,
  });

    const arPath = arweaveWallet.startsWith("~/") ? path.resolve(process.env.HOME, arweaveWallet.slice(2)) : path.resolve(arweaveWallet)

    const arWallet = JSON.parse(fs.readFileSync(arPath).toString())
    const address = await arweave.wallets.jwkToAddress(arWallet);
    const winston = await arweave.wallets.getBalance(address);

    const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, metadataPath)).toString())

    console.log("address = ", address)
    console.log("balance winstons =", winston)

    const arTx = await arweave.createTransaction(
        {
            data: JSON.stringify(metadata),
        },
        arWallet,
    );
    arTx.addTag('App-Name', 'dfs');
    arTx.addTag('Content-Type', 'application/json');

    await arweave.transactions.sign(arTx, arWallet);
    await arweave.transactions.post(arTx);

    const metadataUri = `${protocol}://${host}:${port}/${arTx.id}`
    console.log(`metadata URI = ${metadataUri}`)

}



 

export const getOriginalLookupPDA =  async(auctionKey, metadataKey) => {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      auctionKey.toBuffer(),
      metadataKey.toBuffer(),
    ]);
  }