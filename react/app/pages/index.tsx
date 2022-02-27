import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import PlaceBid from '../components/placeBid'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';


const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>USM test app</title>
        <meta name="description" content="usm test app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>USM TEST</h1>
        <div>
          <WalletMultiButton />
        </div>
        <div>
        <PlaceBid />
        </div>
       
      </main>
    </div>
  )
}

export default Home
