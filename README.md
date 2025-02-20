# Solana GRPC Ultra-Fast pump fun migration to raydium sniper bot

This is a perfect, ultra-fast raydium sniper bot which snipe tokens migrated from pump.fun to raydium using geyser grpc.

This bot buy all tokens migrated from pump.fun to raydium quickly with low price and sell after some time. You can customize buy and sell logic as you like.

# Requirements
This bot use the corvus's great grpc and rpc , so you don't need to purchase any expensive grpc or rpc service.

# Instructions
- Using the Solana CLI, generate a public-bundles.json keypair using the following command
`solana-keygen new --outfile ./public-bundles.json`(There is already this file exists)

- Move this file to your cloned grpc-sniper repo in the top-level parent directory
- Rename `.env.example` to `.env`
- Add your private key in base64 format which can be exported from either Phantom or derived from your JSON keypair for your wallet.

# Commands
- npm i
- npm run start
