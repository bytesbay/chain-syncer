import { ethers as Ethers } from 'ethers';

if(!process.env['MNEMONIC']) {
  throw new Error('MNEMONIC environment variable not set');
}

const mnemonic_instance = Ethers.Wallet.fromPhrase(process.env['MNEMONIC']);
const ethers_provider = new Ethers.JsonRpcProvider(process.env['RPC_URL'], Number(process.env['NETWORK_ID']));
const ethers_signer = new Ethers.Wallet(
  mnemonic_instance.privateKey, 
  ethers_provider
);

export { ethers_provider, ethers_signer }