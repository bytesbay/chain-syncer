import { ethers as Ethers } from 'ethers';
import { InMemoryAdapter } from '../lib/in-memory-adapter';
import { ChainSyncer } from '../lib/chain-syncer';
import { deploy } from '../contract-deployer';
import { ethers_provider } from '../ethers-init';
import { IChainSyncerOptions } from '@/types';

jest.setTimeout(30000);

describe('Chain-Syncer', () => {

  const waitForEvents = (cond: any, onResolve: any) => {
    return new Promise((resolve, reject) => {
      const pop = async () => {
        const events = await syncer.selectPendingEvents(subscriber_name);
  
        if (cond(events)) {
          onResolve(events);
          resolve(undefined);
        } else {
          setTimeout(() => pop(), 100);
        }
      }
  
      pop();
    });
  }

  const getSubs = (name: string) => {
    return syncer.subscribers.find(n => n.name === name);
  }

  const default_opts: IChainSyncerOptions = {
    ethers_provider: ethers_provider,
    mode: 'scanner',
    tick_interval: 500,
    safe_rescan_every_n_block: 3,
    block_time: 500,

    async contractsGetter(contract_name: string) {
      const contracts: Record<string, Ethers.Contract> = {
        Items,
        Materials,
      };

      return {
        ethers_contract: contracts[contract_name],
        deploy_transaction_hash: contracts[contract_name].deployTransaction.hash
      };
    }
  };

  let Items: Ethers.Contract;
  let Materials: Ethers.Contract;

  beforeAll(async () => {

    const contracts = await deploy();

    Items = contracts.Items;
    Materials = contracts.Materials;

    adapter = new InMemoryAdapter();
    syncer = new ChainSyncer(adapter, default_opts);
    await syncer.start();
  });

  let adapter: InMemoryAdapter;
  let syncer: ChainSyncer;
  
  const subscriber_name = 'test-subs';

  it('should add new event', async () => {

    await syncer.updateSubscriber(subscriber_name, [ 'Items.ItemCreated' ]);

    expect(syncer.used_contracts).toEqual([ 'Items' ]);
    expect(getSubs(subscriber_name)).toBeTruthy();
    
    await (await Items.addItem(23)).wait();

    await waitForEvents((events: any[]) => events.length > 0, (events: any[]) => {
      expect(events[0].event).toEqual('ItemCreated');
      expect(events[0].contract).toEqual('Items');
      expect(events[0].args).toEqual([ '0', 23 ]);
    });

  });


  it('should mark that event as processed and never return it again', async () => {

    let events = await syncer.selectPendingEvents(subscriber_name);

    await syncer.markEventsAsProcessed(subscriber_name, events.map(n => n.id));
    events = await syncer.selectPendingEvents(subscriber_name);
    expect(events.length).toBe(0);
    
  });


  it('should unsubscribe from event and subscribe again without adding it to queue again', async () => {

    await syncer.updateSubscriber(subscriber_name, [ 'Items.ItemUpdated' ]);

    const checker = (events: any[]) => {
      expect(events.length).toBe(1);
      expect(events[0].event).toEqual('ItemUpdated');
      expect(events[0].contract).toEqual('Items');
      expect(events[0].args).toEqual([ '0', 24 ]);
    }

    await (await Items.updateItem('0', 24)).wait();

    await waitForEvents((events: any[]) => events.length > 0, checker);

    await syncer.updateSubscriber(subscriber_name, [  ]);

    let events = await syncer.selectPendingEvents(subscriber_name);

    expect(events.length).toBe(0);

    await syncer.updateSubscriber(subscriber_name, [ 'Items.ItemCreated', 'Items.ItemUpdated' ]);

    await waitForEvents((events: any[]) => events.length > 0, checker);
    
  });


  it('should sync events from past', async () => {

    await syncer.updateSubscriber(subscriber_name, [  ]);

    await (await Materials.addMaterial(23)).wait();
    await (await Materials.addMaterial(24)).wait();
    await (await Materials.updateMaterial('1', 24)).wait();

    await (await Items.addItem(40)).wait();
    await (await Items.addItem(20)).wait();
    await (await Items.addItem(50)).wait();
    await (await Items.addItem(30)).wait();

    await syncer.updateSubscriber(subscriber_name, [ 'Materials.MaterialCreated' ]);

    await waitForEvents((events: any[]) => events.length >= 2, (events: any[]) => {
      expect(events[0].contract).toEqual('Materials');
      expect(events[1].contract).toEqual('Materials'); 
    });

    await syncer.updateSubscriber(subscriber_name, [
      'Materials.MaterialCreated', 
      'Materials.MaterialUpdated'
    ]);

    await waitForEvents((events: any[]) => events.length >= 3, (events: any[]) => {
      expect(events[2].contract).toEqual('Materials');
    });

  });

  afterAll(async () => {
    await syncer.stop();
  });
})