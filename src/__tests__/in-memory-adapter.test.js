import { ethers as Ethers } from 'ethers';
import { InMemoryAdapter } from '../lib/in-memory-adapter';
import { mockEvent } from '../test-helpers';

// const mnemonic_instance = Ethers.Wallet.fromMnemonic(process.env['ACCOUNT_MNEMONIC']);
// const ethers_provider = new Ethers.providers.JsonRpcProvider(process.env['CHAIN_PROVIDER_URL']);
// const ethers_signer = new Ethers.Wallet(
//   mnemonic_instance.privateKey, 
//   ethers_provider
// );

describe('In-Memory-Adapter', () => {

  /**
   * @type {InMemoryAdapter}
   */
  let adapter = null;
  
  const subscriber_name = 'test-subs';
  const another_subscriber_name = 'api';

  describe('updateSubscriber()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    it('should create subscriber', async () => {

      const res = await adapter.updateSubscriber(subscriber_name, [ 'Test.ItemCreated' ]);
  
      expect(res.events_added).toEqual([ 'Test.ItemCreated' ]);
      expect(res.events_removed).toEqual([]);

      const subscribers = await adapter.selectAllSubscribers();
      expect(Object.values(subscribers).length).toBe(1);
      expect(subscribers[subscriber_name]).toBeTruthy();
      expect(subscribers[subscriber_name].events).toEqual([ 'Test.ItemCreated' ]);
    });

    it('should update subscriber but with no updates', async () => {
      
      const res = await adapter.updateSubscriber(subscriber_name, [ 'Test.ItemCreated' ]);

      expect(res.events_added).toEqual([]);
      expect(res.events_removed).toEqual([]);

      const subscribers = await adapter.selectAllSubscribers();
      expect(Object.values(subscribers).length).toBe(1);
      expect(subscribers[subscriber_name]).toBeTruthy();
      expect(subscribers[subscriber_name].events).toEqual([ 'Test.ItemCreated' ]);
    });

    it('should update subscriber and add new events to listen', async () => {
      
      const res = await adapter.updateSubscriber(subscriber_name, [ 'Test.ItemCreated', 'Test.ItemUpdated', 'Test.ItemRemoved' ]);

      expect(res.events_added).toEqual([ 'Test.ItemRemoved', 'Test.ItemUpdated' ]);
      expect(res.events_removed).toEqual([]);

      const subscribers = await adapter.selectAllSubscribers();
      expect(Object.values(subscribers).length).toBe(1);
      expect(subscribers[subscriber_name]).toBeTruthy();
      expect(subscribers[subscriber_name].events).toEqual([ 'Test.ItemCreated', 'Test.ItemRemoved', 'Test.ItemUpdated' ]);
    });

    it('should update subscriber and remove some events', async () => {
      
      const res = await adapter.updateSubscriber(subscriber_name, [ 'Test.ItemCreated' ]);

      expect(res.events_removed).toEqual([ 'Test.ItemRemoved', 'Test.ItemUpdated' ]);
      expect(res.events_added).toEqual([]);

      const subscribers = await adapter.selectAllSubscribers();
      expect(Object.values(subscribers).length).toBe(1);
      expect(subscribers[subscriber_name]).toBeTruthy();
      expect(subscribers[subscriber_name].events).toEqual([ 'Test.ItemCreated' ]);
    });

    it('should update subscriber and remove event + add new event', async () => {
      
      const res = await adapter.updateSubscriber(subscriber_name, [ 'Test.ItemKilled' ]);

      expect(res.events_removed).toEqual([ 'Test.ItemCreated' ]);
      expect(res.events_added).toEqual([ 'Test.ItemKilled' ]);

      const subscribers = await adapter.selectAllSubscribers();
      expect(Object.values(subscribers).length).toBe(1);
      expect(subscribers[subscriber_name]).toBeTruthy();
      expect(subscribers[subscriber_name].events).toEqual([ 'Test.ItemKilled' ]);
    });
  });


  describe('saveEvents()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    const initial_events = [
      mockEvent('ItemCreated'),
      mockEvent('ItemKilled'),
      mockEvent('ItemUpdated'),
    ];

    it('should add events', async () => {

      await adapter.saveEvents([
        ...initial_events
      ], [ subscriber_name ]);

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);

      expect(events.length).toBe(3);
      expect(events.map(n => n.event)).toEqual([
        'ItemCreated',
        'ItemKilled',
        'ItemUpdated',
      ]);
    });

    it('should add events to another listener', async () => {

      await adapter.saveEvents([
        mockEvent('ItemCreated'),
      ], [ another_subscriber_name ]);

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(another_subscriber_name);

      expect(events.length).toBe(1);
      expect(events.map(n => n.event)).toEqual([
        'ItemCreated',
      ]);
    });

    it('should throw error trying to add events', async () => {

      expect(adapter.saveEvents([
        initial_events[2],
      ], [ subscriber_name ])).rejects.toThrow('Some events already exist');

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);

      expect(events.length).toBe(3);
      expect(events.map(n => n.event)).toEqual([
        'ItemCreated',
        'ItemKilled',
        'ItemUpdated',
      ]);
    });
  });


  describe('addUnprocessedEventsToQueue()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    it('should add queue events', async () => {

      await adapter.saveEvents([
        mockEvent('ItemCreated'),
        mockEvent('ItemKilled'),
      ], []);

      await adapter.addUnprocessedEventsToQueue(subscriber_name, [ 'Test.ItemCreated', 'Test.ItemKilled' ]);

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);

      expect(events.length).toBe(2);
      expect(events.map(n => n.event)).toEqual([
        'ItemCreated',
        'ItemKilled',
      ]);
    });

    it('should not add anything to queue', async () => {

      await adapter.saveEvents([
        mockEvent('ItemUpdated'),
      ], [ subscriber_name ]);

      await adapter.addUnprocessedEventsToQueue(subscriber_name, [ 'Test.ItemCreated', 'Test.ItemKilled', 'Test.ItemUpdated' ]);

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);

      expect(events.length).toBe(3);
      expect(events.map(n => n.event)).toEqual([
        'ItemCreated',
        'ItemKilled',
        'ItemUpdated',
      ]);
    });
  });


  describe('saveLatestScannedBlockNumber()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    it('just save the block', async () => {
        
      await adapter.saveLatestScannedBlockNumber('Test', 1);

      let block = await adapter.getLatestScannedBlockNumber('Test');

      expect(block).toBe(1);
    });
  });


  describe('setEventProcessedForSubscriber()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    it('process one of the events and return less events for processing', async () => {

      const initial_events = [
        mockEvent('ItemCreated'),
        mockEvent('ItemKilled'),
      ];
      
      await adapter.saveEvents([
        ...initial_events
      ], [ subscriber_name ]);
  
      await adapter.setEventProcessedForSubscriber(initial_events[0].id, subscriber_name);
  
      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);
  
      expect(events.length).toBe(1);
      expect(events.map(n => n.event)).toEqual([
        'ItemKilled',
      ]);
    });
  });


  describe('removeQueue()', () => {

    beforeAll(() => {
      adapter = new InMemoryAdapter();
    });

    it('should remove events from queue', async () => {
        
      await adapter.saveEvents([
        mockEvent('ItemCreated'),
        mockEvent('ItemKilled'),
      ], [ subscriber_name ]);

      await adapter.removeQueue(subscriber_name, [ 'Test.ItemCreated' ]);

      let events = await adapter.selectAllUnprocessedEventsBySubscriber(subscriber_name);

      expect(events.length).toBe(1);
      expect(events.map(n => n.event)).toEqual([
        'ItemKilled',
      ]);
    });
  });
})