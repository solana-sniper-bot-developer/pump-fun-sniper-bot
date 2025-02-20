import { Filter, FilterResult } from './pool-filters';
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { Connection } from '@solana/web3.js';
import { logger } from '../utils';

export class PoolSizeFilter implements Filter {
  constructor(
    private readonly connection: Connection,
    private readonly quoteToken: Token,
    private readonly minPoolSize: TokenAmount,
    private readonly maxPoolSize: TokenAmount,
  ) {}

  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
        let balance_response
        while(true){
            try{
                logger.info("getting pool size...")
                balance_response=await this.connection.getTokenAccountBalance(poolKeys.baseVault)
                break
            }catch(e){
                await new Promise((resolve)=>setTimeout(resolve,1000))
            }
        }      
        const poolSize = new TokenAmount(this.quoteToken, balance_response.value.amount, true);
      
      let inRange = true;
      console.log("------>poolsize", balance_response.value.uiAmount," wsol")
      if (!this.maxPoolSize?.isZero()) {
        inRange = poolSize.raw.lte(this.maxPoolSize.raw);

        if (!inRange) {
          return { ok: false, message: `PoolSize -> Pool size ${poolSize.toFixed()} > ${this.maxPoolSize.toFixed()}` };
        }
      }

      if (!this.minPoolSize?.isZero()) {
        inRange = poolSize.raw.gte(this.minPoolSize.raw);

        if (!inRange) {
          return { ok: false, message: `PoolSize -> Pool size ${poolSize.toFixed()} < ${this.minPoolSize.toFixed()}` };
        }
      }

      return { ok: inRange };
    } catch (error) {
      logger.error(`Failed to check pool size`);
      console.log(error)
    }

    return { ok: false, message: 'PoolSize -> Failed to check pool size' };
  }
}
