import { ethers as Ethers } from 'ethers';
import { InMemoryAdapter } from '../lib/in-memory-adapter';
import { ChainSyncer } from '../lib/chain-syncer';
import { deploy } from '../contract-deployer';
import { ethers_provider } from '../ethers-init';
import { IChainSyncerAdapter, IChainSyncerEventMetadata, IChainSyncerOptions, IChainSyncerSubscriber } from '@/types';

const Utils = Ethers;

jest.setTimeout(30000);

describe('Chain-Syncer (mono mode)', () => {

  const getSubs = async (name: string): Promise<IChainSyncerSubscriber> => {

    const subs = syncer.subscribers.find(n => n.name === name);

    if(!subs) {
      throw new Error(`Subscriber ${name} not found`);
    }

    return subs;
  }

  const assertTxMetadata = ({
    global_index, block_number, block_timestamp, transaction_hash, from_address
  }: IChainSyncerEventMetadata) => {
    expect(global_index).toBeGreaterThan(1000000);
    expect(block_number).toBeGreaterThan(1);
    expect(block_timestamp).toBeGreaterThan(0);
    expect(transaction_hash).toBeTruthy();
    expect(Utils.isAddress(from_address)).toBe(true);
  }

  const default_opts: IChainSyncerOptions = {
    rpc_url: ethers_provider._getConnection().url,
    mode: 'mono',
    tick_interval: 500,
    safe_rescan_every_n_block: 3,
    block_time: 500,

    async contractsResolver(contract_name: string) {
      const contracts: Record<string, Ethers.Contract> = {
        Items,
        Materials,
      };

      const abis: Record<string, any[]> = {
        Items: items_abi,
        Materials: materials_abi,
      };

      return {
        contract_abi: abis[contract_name],
        start_block: await ethers_provider.getBlockNumber(),
        address: await contracts[contract_name].getAddress(),
      };
    }
  };

  let Items: Ethers.Contract;
  let Materials: Ethers.Contract;
  let items_abi: any[];
  let materials_abi: any[];

  beforeEach(async () => {

    if(syncer && syncer._is_started) {
      syncer.stop();
    }

    const contracts = await deploy();

    Items = contracts.Items;
    Materials = contracts.Materials;
    items_abi = contracts.items_abi;
    materials_abi = contracts.materials_abi;

    adapter = new InMemoryAdapter();
    syncer = new ChainSyncer(adapter, default_opts);
  });

  let adapter: IChainSyncerAdapter;

  let syncer: ChainSyncer;
  
  const subscriber_name = 'test-subs';

  it('should add new listener and execute this listener', async () => {

    await new Promise(async resolve => {

      const listener = (
        tx_metadata: IChainSyncerEventMetadata,
        item_id: any,
        damage: any,
      ) => {

        expect(item_id).toBe('0');
        expect(damage).toBe(23);

        assertTxMetadata(tx_metadata);

        resolve(undefined);
      }
      
      syncer.on('Items.ItemCreated', listener);

      expect(syncer.listeners['Items.ItemCreated']).toEqual({
        full_event: 'Items.ItemCreated',
        listener,
        contract_name: 'Items',
        event_name: 'ItemCreated',
      });

      await syncer.start();
      
      await (await Items.addItem(23)).wait();
    });
  });


  it('should postpone event 3 times and than resolve it', async () => {

    let tries = 0;

    await new Promise(async resolve => {

      const listener = (
        tx_metadata: IChainSyncerEventMetadata,
        item_id: any,
        damage: any,
      ) => {

        if(++tries <= 3) {
          return false
        }

        expect(item_id).toBe('0');
        assertTxMetadata(tx_metadata);
        resolve(undefined);
      }
      
      syncer.on('Items.ItemCreated', listener);

      expect(syncer.listeners['Items.ItemCreated']).toEqual({
        full_event: 'Items.ItemCreated',
        listener,
        contract_name: 'Items',
        event_name: 'ItemCreated',
      });

      await syncer.start();
      
      await (await Items.addItem(34)).wait();
    });

    expect(tries).toBe(4);
  });


  it('should postpone event 3 times (because of errors) and than resolve it', async () => {

    let tries = 0;

    await new Promise(async resolve => {

      const listener = (
        tx_metadata: IChainSyncerEventMetadata,
        item_id: any,
        damage: any,
      ) => {

        if(++tries <= 3) {
          throw new Error('Listener is not ready yet (it is okay)');
        }

        expect(item_id).toBe('0');
        assertTxMetadata(tx_metadata);
        resolve(undefined);
      }
      
      syncer.on('Items.ItemCreated', listener);

      expect(syncer.listeners['Items.ItemCreated']).toEqual({
        full_event: 'Items.ItemCreated',
        listener,
        contract_name: 'Items',
        event_name: 'ItemCreated',
      });

      await syncer.start();
      
      await (await Items.addItem(2)).wait();
    });

    expect(tries).toBe(4);
  });


  afterAll(() => {
    syncer.stop();
  });
})