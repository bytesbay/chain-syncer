import { IChainSyncerAdapter, IChainSyncerEvent, IChainSyncerSubscriber } from "@/types";
import { IEvent, toEvent } from "./event";
import { IQueueEvent, toQueueEvent } from "./queue-event";

interface ISubscriber {
  name: string;
  events: string[];
  added_at: Record<string, number>;
}

export class InMemoryAdapter implements IChainSyncerAdapter {

  latest_blocks: Record<string, number> = {}
  events: IEvent[] = []
  events_queue: IQueueEvent[] = []
  subscribers: Record<string, ISubscriber> = {}

  _is_chainsyncer_adapter = true
  
  constructor() {
    // ...
  }

  async getLatestScannedBlockNumber(contract_name: string) {

    const item = this.latest_blocks[contract_name];

    if(item) {
      return item;
    }
    
    return 0;
  }

  async removeQueue(subscriber: string, events: string[]) {
    
    const indexes = events.map(n => {

      const [ contract, event ] = n.split('.');

      return this.events_queue.findIndex(z => {
        return z.event === event && z.contract === contract && z.subscriber === subscriber
      });
    })

    indexes.forEach(n => {
      this.events_queue.splice(n, 1);
    })
  }

  async addUnprocessedEventsToQueue(subscriber: string, events: string[]) {

    events.forEach(e => {
      const [ contract, event ] = e.split('.');

      const unprocessed_events = this.events.filter(n => {
        return !n.processed_subscribers[subscriber] && n.contract === contract && n.event === event
      });

      this.events_queue.push(
        ...unprocessed_events.map(n => toQueueEvent(n, subscriber))
      );
    })
  }

  async selectAllSubscribers() {
    return [ ...Object.values(this.subscribers) ];
  }

  async updateSubscriber(subscriber: string, events: string[]) {

    events = [ ...events.sort() ];

    if(!this.subscribers[subscriber]) {
      this.subscribers[subscriber] = {
        name: subscriber,
        events: [],
        added_at: {
          ...this.latest_blocks
        }
      };
    }

    const events_added = events.filter(n => !this.subscribers[subscriber].events.includes(n));
    const events_removed = this.subscribers[subscriber].events.filter(n => !events.includes(n));

    this.subscribers[subscriber].events = events;

    return { events_added, events_removed };
  }

  async saveLatestScannedBlockNumber(contract_name: string, block_number: number) {
    this.latest_blocks[contract_name] = block_number;
  }

  async selectAllUnprocessedEventsBySubscriber(
    subscriber: string
  ) {

    const from_queue = this.events_queue
      .filter(n => n.subscriber === subscriber)
      .map(n => n.event_id);

    const events = this.events.filter(n => from_queue.includes(n.id))

    return events;
  }

  async setEventProcessedForSubscriber(id: string, subscriber: string) {

    const item = this.events.find(n => n.id === id);

    if(item) {
      item.processed_subscribers[subscriber] = true;

      const __id = id + '_' + subscriber;

      const index = this.events_queue.findIndex(n => n.id === __id)
      
      if(index !== -1) {
        this.events_queue.splice(index, 1);
      }
    }
  }

  async filterExistingEvents(ids: string[]) {

    const exist_ids = this.events.filter(n => {
      return ids.includes(n.id)
    }).map(n => n.id);

    ids = ids.filter(n => !exist_ids.includes(n));

    return ids;
  }


  async saveEvents(_events: IChainSyncerEvent[], subscribers: IChainSyncerSubscriber[]) {

    if(!_events.length) {
      return;
    }

    const events = _events.map(n => toEvent(n))

    const non_exist_ids = await this.filterExistingEvents(events.map(n => n.id));
    
    if(non_exist_ids.length !== events.length) {
      throw new Error('Some events already exist');
    }

    this.events.push(...events);
    
    for (const i in subscribers) {

      const subs = subscribers[i];

      const filtered_events = events.filter(n => {
        const full = n.contract + '.' + n.event;
        return subs.events.includes(full);
      })

      this.events_queue.push(
        ...filtered_events.map(n => toQueueEvent(n, subs.name))
      );
    }
  }
}