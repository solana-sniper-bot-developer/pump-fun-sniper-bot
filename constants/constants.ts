import { Commitment } from "@solana/web3.js";
import { logger, retrieveEnvVariable } from "../utils";

export const NETWORK = 'mainnet-beta';
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT', logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT', logger);
export const LOG_LEVEL = retrieveEnvVariable('LOG_LEVEL', logger);
export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
export const QUOTE_MINT = retrieveEnvVariable('QUOTE_MINT', logger);
export const QUOTE_AMOUNT = Number(retrieveEnvVariable('QUOTE_AMOUNT', logger));

export const TAKE_PROFIT = Number(retrieveEnvVariable('TAKE_PROFIT', logger));
export const STOP_LOSS = Number(retrieveEnvVariable('STOP_LOSS', logger));
export const SKIP_SELLING_IF_LOST_MORE_THAN = Number(retrieveEnvVariable('SKIP_SELLING_IF_LOST_MORE_THAN', logger));
export const PRICE_CHECK_DURATION = Number(retrieveEnvVariable('PRICE_CHECK_DURATION', logger));
export const PRICE_CHECK_INTERVAL = Number(retrieveEnvVariable('PRICE_CHECK_INTERVAL', logger));
export const SELL_SLIPPAGE = Number(retrieveEnvVariable('SELL_SLIPPAGE', logger));


export const CHECK_IF_BURNED = retrieveEnvVariable('CHECK_IF_BURNED', logger)==="true";
export const CHECK_IF_FREEZABLE = retrieveEnvVariable('CHECK_IF_FREEZABLE', logger)==="true";
export const CHECK_IF_MINT_IS_RENOUNCED = retrieveEnvVariable('CHECK_IF_MINT_IS_RENOUNCED', logger)==="true";
export const MIN_POOL_SIZE = Number(retrieveEnvVariable('MIN_POOL_SIZE', logger));
export const MAX_POOL_SIZE = Number(retrieveEnvVariable('MAX_POOL_SIZE', logger));
export const MIN_POOL_SIZE_SELL = Number(retrieveEnvVariable('MIN_POOL_SIZE_SELL', logger));
export const MAX_POOL_SIZE_SELL = Number(retrieveEnvVariable('MAX_POOL_SIZE_SELL', logger));