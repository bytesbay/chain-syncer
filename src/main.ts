import { ChainSyncer, IChainSyncerEventMetadata, InMemoryAdapter, TChainSyncerEventArg } from './lib';
import abi from '@/abis/BUSD.json';
import { ethers as Ethers } from 'ethers';

const test = async () => {

  // Connection to MetaMask wallet
  const provider = new Ethers.providers.JsonRpcProvider('https://bscrpc.com')

  const contracts: Record<string, any> = {
    'BUSD': {
      ethers_contract: new Ethers.Contract('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', abi, provider),
      deploy_transaction_hash: '0x0f01fc521030f178115c880e200b09a40c9510f49de227aa880276f92670a3d6'
    }
  }

  const adapter = new InMemoryAdapter();

  const syncer = new ChainSyncer(adapter, {

    verbose: true,
    ethers_provider: provider,
    block_time: 3500,

    query_block_limit: 200,

    async contractsGetter(contract_name: string) {
      const item = contracts[contract_name];
      return {
        ethers_contract: item.ethers_contract,
        deploy_transaction_hash: item.deploy_transaction_hash,
      };
    },
  });

  let volume = 0;

  syncer.on('BUSD.Transfer', (
    event_metadata: IChainSyncerEventMetadata,
    from: any,
    to: any,
    amount: any,
  ) => {

    amount = Ethers.utils.formatEther(amount) // format from wei
    volume += Number(amount);

    console.log('Transfer', amount);
  });

  syncer.on('BUSD.Approval', (
    event_metadata: IChainSyncerEventMetadata,
    address: any,
    amount: any,
  ) => {
    console.log('Approval', Ethers.utils.formatEther(amount), address);
  });

  await syncer.start();

  // @ts-ignore
  window.syncer = syncer;

  // @ts-ignore
  window.adapter = adapter;
}

// @ts-ignore
document.querySelector('#btn').addEventListener('click', () => test())