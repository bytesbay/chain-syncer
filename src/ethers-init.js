import { ethers as Ethers } from 'ethers';

const mnemonic_instance = Ethers.Wallet.fromMnemonic(process.env['MNEMONIC']);
const ethers_provider = new Ethers.providers.JsonRpcProvider(process.env['RPC_URL'], Number(process.env['NETWORK_ID']));
const ethers_signer = new Ethers.Wallet(
  mnemonic_instance.privateKey, 
  ethers_provider
);

export { ethers_provider, ethers_signer }