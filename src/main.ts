import { IChainSyncerEventMetadata, TChainSyncerEventArg } from './types';
import abi from '@/abis/Items.json';
import * as Ethers from 'ethers';
import { IChainSyncerContractsResolverResult } from './types';
import ChainSyncer, { InMemoryAdapter } from './lib';

const test = async () => {

  const contracts: Record<string, IChainSyncerContractsResolverResult> = {
    'BUSD': {
      contract_abi: abi,
      start_block: 895890,
      address: '0xF1e4D5B35A3F173EdD62E1CF57B58d764c976CC6',
    },
  }

  const adapter = new InMemoryAdapter();

  const syncer = new ChainSyncer(adapter, {

    // verbose: true,
    rpc_url: 'https://zksync2-testnet.zksync.dev',
    block_time: 500,

    query_block_limit: 50,
    safe_rescans_to_repeat: 1,
    safe_rescan_every_n_block: 10,
    network_id: 280,

    async contractsResolver(contract_name: string) {
      // console.log(await syncer.cached_providers['https://zksync2-testnet.zksync.dev'].getNetwork());
      
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

  syncer.on('BUSD.NftMinted', (
    event_metadata: IChainSyncerEventMetadata,
    ...args: TChainSyncerEventArg[]
  ) => {
    console.log('WOW', event_metadata, args);
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