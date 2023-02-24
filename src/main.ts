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
      address: '0x928Cc1D8F795973774292F769EFBe06C5671A887',
    },
  }

  const adapter = new InMemoryAdapter();

  const syncer = new ChainSyncer(adapter, {

    // verbose: true,
    rpc_url: ['https://bscrpc.com', 'https://bsc-dataseed1.binance.org'],
    block_time: 500,

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

  syncer.on('BUSD.Kek', (
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