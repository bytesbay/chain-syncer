import { IChainSyncerEventMetadata, TChainSyncerEventArg } from './types';
import abi from '@/abis/BUSD.json';
import * as Ethers from 'ethers';
import { IChainSyncerContractsResolverResult } from './types';
import ChainSyncer, { InMemoryAdapter } from './lib';

const test = async () => {

  const contracts: Record<string, IChainSyncerContractsResolverResult> = {
    'BUSD': {
      contract_abi: abi,
      start_block: 25548364,
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    },
    'DAI': {
      contract_abi: abi,
      start_block: 20548364,
      address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    },
    'USDC': {
      contract_abi: abi,
      start_block: 25548364,
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    'USDT': {
      contract_abi: abi,
      start_block: 20548364,
      address: '0x55d398326f99059fF775485246999027B3197955',
    },
  }

  const adapter = new InMemoryAdapter();

  const syncer = new ChainSyncer(adapter, {

    verbose: true,
    rpc_url: ['https://bscrpc.com', 'https://bsc-dataseed1.binance.org'],
    block_time: 10000,

    query_block_limit: 10,
    safe_rescans_to_repeat: 1,
    safe_rescan_every_n_block: 10,

    async contractsResolver(contract_name: string) {
      return contracts[contract_name];
    },
  });

  // let volume = 0;

  // syncer.on('BUSD.Transfer', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   from: any,
  //   to: any,
  //   amount: any,
  // ) => {

  //   amount = Ethers.formatEther(amount) // format from wei
  //   volume += Number(amount);

  //   console.log('Transfer', amount);
  // });

  // syncer.on('USDT.Transfer', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   from: any,
  //   to: any,
  //   amount: any,
  // ) => {

  //   amount = Ethers.formatEther(amount) // format from wei
  //   volume += Number(amount);

  //   console.log('Transfer', amount);
  // });

  syncer.on('BUSD.Approval', (
    event_metadata: IChainSyncerEventMetadata,
    address: any,
    amount: any,
  ) => {
    // ...
  });

  syncer.on('DAI.Approval', (
    event_metadata: IChainSyncerEventMetadata,
    address: any,
    amount: any,
  ) => {
    // ...
  });

  syncer.on('USDC.Approval', (
    event_metadata: IChainSyncerEventMetadata,
    address: any,
    amount: any,
  ) => {
    // ...
  });

  await syncer.start();

  // @ts-ignore
  window.syncer = syncer;

  // @ts-ignore
  window.adapter = adapter;
}

// @ts-ignore
document.querySelector('#btn').addEventListener('click', () => test())

// @ts-ignore
document.querySelector('#stop').addEventListener('click', () => window.syncer.stop())