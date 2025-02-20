import { streamNewTokens } from './streaming/raydium';
import { streamOpenbook } from './streaming/openbook';

require('dotenv').config();


import * as Fs from 'fs';

import { Connection, Keypair, PublicKey, TransactionMessage, VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import { logger } from './utils/logger';
import { init } from './transaction/transaction';
import Client from '@triton-one/yellowstone-grpc';

const blockEngineUrl = process.env.BLOCK_ENGINE_URL || '';
console.log('BLOCK_ENGINE_URL:', blockEngineUrl);

const authKeypairPath = process.env.AUTH_KEYPAIR_PATH || '';
console.log('AUTH_KEYPAIR_PATH:', authKeypairPath);
const decodedKey = new Uint8Array(
  JSON.parse(Fs.readFileSync(authKeypairPath).toString()) as number[]
);
const keypair = Keypair.fromSecretKey(decodedKey);
const client = new Client("http://rpc.corvus-labs.io:10101/", undefined, undefined); //grpc endpoint from Solana Vibe Station obviously


async function start() {

  await init();

  streamNewTokens(client);
  streamOpenbook(client);

}

start();
