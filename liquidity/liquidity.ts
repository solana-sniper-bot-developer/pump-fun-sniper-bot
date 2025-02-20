import { Commitment, Connection, PublicKey } from '@solana/web3.js';
import {
  Liquidity,
  LiquidityPoolKeys,
  Market,
  TokenAccount,
  SPL_ACCOUNT_LAYOUT,
  publicKey,
  struct,
  MAINNET_PROGRAM_ID,
  LiquidityStateV4,
} from '@raydium-io/raydium-sdk';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { MinimalMarketLayoutV3 } from '../market';
import BN from 'bn.js';

export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;
export const OPENBOOK_PROGRAM_ID = MAINNET_PROGRAM_ID.OPENBOOK_MARKET;

export const MINIMAL_MARKET_STATE_LAYOUT_V3 = struct([
  publicKey('eventQueue'),
  publicKey('bids'),
  publicKey('asks'),
]);

export function createPoolKeys(
  id: PublicKey,
  accountData: LiquidityStateV4,
  minimalMarketLayoutV3: MinimalMarketLayoutV3,
): LiquidityPoolKeys {
  return {
    id,
    baseMint: accountData.baseMint,
    quoteMint: accountData.quoteMint,
    lpMint: accountData.lpMint,
    baseDecimals: accountData.baseDecimal.toNumber(),
    quoteDecimals: accountData.quoteDecimal.toNumber(),
    lpDecimals: 6,
    version: 4,   
    programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    authority: Liquidity.getAssociatedAuthority({
      programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    }).publicKey,
    openOrders: accountData.openOrders,
    targetOrders: accountData.targetOrders,
    baseVault: accountData.baseVault,
    quoteVault: accountData.quoteVault,
    marketVersion: 3,
    marketProgramId: accountData.marketProgramId,
    marketId: accountData.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: accountData.marketProgramId,
      marketId: accountData.marketId,
    }).publicKey,
    marketBaseVault: accountData.baseVault,
    marketQuoteVault: accountData.quoteVault,
    marketBids: minimalMarketLayoutV3.bids,
    marketAsks: minimalMarketLayoutV3.asks,
    marketEventQueue: minimalMarketLayoutV3.eventQueue,
    withdrawQueue: accountData.withdrawQueue,
    lpVault: accountData.lpVault,
    lookupTableAccount: PublicKey.default,
  };
}

export async function getTokenAccounts(
  connection: Connection,
  owner: PublicKey,
  commitment?: Commitment,
) {
  const tokenResp = await connection.getTokenAccountsByOwner(
    owner,
    {
      programId: TOKEN_PROGRAM_ID,
    },
    commitment,
  );

  const accounts: TokenAccount[] = [];
  for (const { pubkey, account } of tokenResp.value) {
    accounts.push({
      pubkey,
      programId: account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
    });
  }

  return accounts;
}

export async function fetchInfo(connection:Connection,poolstate:LiquidityStateV4, poolkeys:LiquidityPoolKeys){
  const status=poolstate.status
  const baseDecimals=Number(poolkeys.baseDecimals)
  const quoteDecimals=Number(poolkeys.quoteDecimals)
  const lpDecimals=Number(poolkeys.lpDecimals)
  const baseVault=new PublicKey(poolkeys.baseVault)
  const quoteVault=new PublicKey(poolkeys.quoteVault)
  const lpVault=new PublicKey(poolkeys.lpVault)
  const baseReserve_response=await connection.getTokenAccountBalance(baseVault)
  const quoteReserve_response=await connection.getTokenAccountBalance(quoteVault)
  const lpSupply_response=await connection.getTokenAccountBalance(lpVault)
  const baseReserve=new BN(baseReserve_response.value.amount)
  const quoteReserve=new BN(quoteReserve_response.value.amount)
  const lpSupply=new BN(lpSupply_response.value.amount)
  const startTime=poolstate.poolOpenTime
  return{
    status,
    baseDecimals,
    quoteDecimals,
    lpDecimals,
    baseReserve,
    quoteReserve,
    lpSupply,
    startTime:new BN(startTime)
  }
}