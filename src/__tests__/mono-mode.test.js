import { ethers as Ethers } from 'ethers';
import { InMemoryAdapter } from '../lib/in-memory-adapter';
import { ChainSyncer } from '../lib/chain-syncer';
import { deploy } from '../contract-deployer';
import { ethers_provider } from '../ethers-init';

const Utils = Ethers.utils;

jest.setTimeout(30000);

describe('Chain-Syncer (mono mode)', () => {

  const getSubs = name => {
    return syncer.subscribers.find(n => n.name === name);
  }

  const assertTxMetadata = ({
    global_index, block_number, block_timestamp, transaction_hash, from_address
  }) => {
    expect(global_index).toBeGreaterThan(1000000);
    expect(block_number).toBeGreaterThan(1);
    expect(block_timestamp).toBeGreaterThan(0);
    expect(transaction_hash).toBeTruthy();
    expect(Utils.isAddress(from_address)).toBe(true);
  }

  const default_opts = {
    ethers_provider: ethers_provider,
    mode: 'mono',
    tick_interval: 500,
    safe_rescan_every_n_block: 3,
    block_time: 500,

    async contractsGetter(contract_name) {
      const contracts = {
        Items,
        Materials,
      };

      return {
        inst: contracts[contract_name],
        deploy_transaction_hash: contracts[contract_name].deployTransaction.hash
      };
    }
  };

  /**
   * @type {Ethers.Contract}
   */
  let Items;

  /**
   * @type {Ethers.Contract}
   */
  let Materials;


  beforeEach(async () => {

    if(syncer && syncer._is_started) {
      syncer.stop();
    }

    const contracts = await deploy();

    Items = contracts.Items;
    Materials = contracts.Materials;

    adapter = new InMemoryAdapter();
    syncer = new ChainSyncer(adapter, default_opts);
  });

  /**
   * @type {InMemoryAdapter}
   */
  let adapter = null;

  /**
   * @type {ChainSyncer}
   */
  let syncer = null;
  
  const subscriber_name = 'test-subs';

  it('should add new listener and execute this listener', async () => {

    await new Promise(async resolve => {

      const listener = (
        item_id,
        damage,
        tx_metadata
      ) => {

        expect(item_id).toBe('0');
        expect(damage).toBe(23);

        assertTxMetadata(tx_metadata);

        resolve();
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
        item_id,
        damage,
        tx_metadata
      ) => {

        if(++tries <= 3) {
          return false
        }

        expect(item_id).toBe('0');
        assertTxMetadata(tx_metadata);
        resolve();
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
        item_id,
        damage,
        tx_metadata
      ) => {

        if(++tries <= 3) {
          throw new Error('Listener is not ready yet (it is okay)');
        }

        expect(item_id).toBe('0');
        assertTxMetadata(tx_metadata);
        resolve();
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