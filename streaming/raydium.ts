import { CommitmentLevel, SubscribeRequest } from "@triton-one/yellowstone-grpc";
import pino from "pino";
const transport = pino.transport({
  target: 'pino-pretty',
});

export const logger = pino(
  {
    level: 'info',
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport,
);


import Client from "@triton-one/yellowstone-grpc";
import { LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeysV4, LiquidityStateLayoutV4, LiquidityStateV4, MARKET_STATE_LAYOUT_V3, Token, TokenAmount ,Liquidity} from "@raydium-io/raydium-sdk";
import { Connection, PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { bufferRing } from "./openbook";
import { buy, sell } from "../transaction/transaction";
import { createPoolKeys } from "../liquidity";
import { MIN_POOL_SIZE, MAX_POOL_SIZE, RPC_ENDPOINT, MIN_POOL_SIZE_SELL, MAX_POOL_SIZE_SELL,RPC_WEBSOCKET_ENDPOINT} from "../constants";
import { PoolFilters, PoolFilterArgs } from "../filters";

// uncomment this line to enable Jito leader schedule check and delete the return line.
function slotExists(slot: number): boolean {
  //return leaderSchedule.has(slot);
  return true
}

const solanaConnection = new Connection(RPC_ENDPOINT);

let isBought:boolean=false
export async function streamNewTokens(client:Client) {
  const stream = await client.subscribe();
  const sellstream=await client.subscribe()
  let count=0;
  // Collecting all incoming events.
  stream.on("data",async (data) => {
    if (data.account != undefined) {
      let slotCheckResult = true;
      
      if (slotCheckResult&&isBought==false) {
        isBought=true;
        const poolstate = LIQUIDITY_STATE_LAYOUT_V4.decode(data.account.account.data);
        
        if (poolstate.quoteMint.toString().slice(-4)=="pump"){
          const tokenAccount = new PublicKey(data.account.account.pubkey);
  
          let attempts = 0;
          const maxAttempts = 2;
  
          const intervalId = setInterval(async () => {
            const marketDetails = bufferRing.findPattern(poolstate.quoteMint);
            if (Buffer.isBuffer(marketDetails)) {
              const fullMarketDetailsDecoded = MARKET_STATE_LAYOUT_V3.decode(marketDetails);
              const marketDetailsDecoded = {
                bids: fullMarketDetailsDecoded.bids,
                asks: fullMarketDetailsDecoded.asks,
                eventQueue: fullMarketDetailsDecoded.eventQueue,
              };
              try{
                clearInterval(intervalId); 
                const poolkeys=createPoolKeys(tokenAccount, poolstate, marketDetailsDecoded)
                  const isFreezable=await checkIfTokenIsFrozen(poolkeys.quoteMint,solanaConnection) 
                  if(!isFreezable){
                    await buy(solanaConnection,tokenAccount, poolstate, marketDetailsDecoded);
                    setTimeout(async ()=>{
                        await sell(2,tokenAccount, poolstate, marketDetailsDecoded)
                        isBought=false}
                    ,1000*10)  
                    isBought=false;
                  }else{
                    logger.info(`Token ${poolkeys.quoteMint} can be frozen.`)
                    isBought=false;
                  }
                // }
              }catch(e){
                logger.error(e)
                isBought=false;
              }
            } else if (attempts >= maxAttempts) {
              logger.error("Invalid market details");
              clearInterval(intervalId); 
              isBought=false;
            }
            attempts++;
          }, 100); 
        }

       
      }
    }
  });

  // Create a subscription request.
  const request: SubscribeRequest = {
    "slots": {},
    "accounts": {
      "raydium": {
        "account": [],
        "filters": [
          {datasize:LIQUIDITY_STATE_LAYOUT_V4.span.toString()},
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint').toString(), // Filter for only tokens paired with SOL
              "base58": "So11111111111111111111111111111111111111112"
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapBaseInAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapQuoteOutAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          },

        ],
        "owner": ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] // raydium program id to subscribe to
      }
    },
    "transactions": {},
    "blocks": {},
    "blocksMeta": {},
    "accountsDataSlice": [],
    "commitment": CommitmentLevel.PROCESSED,  // Subscribe to processed blocks for the fastest updates
    entry: {}
  }
  
  // Sending a subscription request.
  await new Promise<void>((resolve, reject) => {
    stream.write(request, (err: null | undefined) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    throw reason;
  });
}

async function checkIfTokenIsFrozen(mintAddress:PublicKey, connection:Connection) {
  const mintInfo = await connection.getParsedAccountInfo(mintAddress);
  
  if (mintInfo.value) {
      const accountData = mintInfo.value.data;

      // Check if accountData is of type ParsedAccountData
      if ('parsed' in accountData) {
          const freezeAuthority = accountData.parsed.info.freezeAuthority;
          if (freezeAuthority) {
              return true
          } else {
              return false
          }
      } else {
          console.log('Account data is not parsed or is a Buffer.');
      }
  } else {
      console.log('Mint account not found.');
  }
}

async function getHoolders(conn:Connection, MINT:PublicKey){
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const TOKEN_ACC_SIZE = 165;
  const accs = await conn.getProgramAccounts(TOKEN_PROGRAM_ID, { dataSlice: { offset: 64, length: 8 }, filters: [{ dataSize: TOKEN_ACC_SIZE }, { memcmp: { offset: 0, bytes: MINT.toBase58() } }] });

  const nonZero = accs.filter((acc) => !acc.account.data.equals(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])));
  return nonZero.length
}