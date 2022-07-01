import { Event } from "./Event";
import { QueueEvent } from "./QueueEvent";

export class InMemoryAdapter {

  latest_blocks = {}
  events = []
  events_queue = []
  subscribers = {}

  _is_chainsyncer_adapter = true
  
  constructor() {
    
  }

  /**
   * 
   * @param {string} contract_name 
   * @returns 
   */
  async getLatestScannedBlockNumber(contract_name) {

    const item = this.latest_blocks[contract_name];

    if(item) {
      return item;
    }
    
    return 0;
  }

  /**
   * 
   * @param {string} subscriber 
   * @param {Array<string>} events 
   */
  async removeQueue(subscriber, events) {
    
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

  /**
   * 
   * @param {string} subscriber 
   * @param {Array<string>} events 
   */
  async addUnprocessedEventsToQueue(subscriber, events) {

    events.forEach(e => {
      const [ contract, event ] = e.split('.');

      const unprocessed_events = this.events.filter(n => {
        return !n.processed_subscribers[subscriber] && n.contract === contract && n.event === event
      });

      this.events_queue.push(
        ...unprocessed_events.map(n => new QueueEvent(n, subscriber))
      );
    })
  }

  /**
   * 
   * @returns 
   */
  async selectAllSubscribers() {
    return [ ...Object.values(this.subscribers) ];
  }

  /**
   * 
   * @param {string} subscriber 
   * @param {Array<string>} events 
   * @returns 
   */
  async updateSubscriber(subscriber, events) {

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

  async saveLatestScannedBlockNumber(contract_name, block_number) {
    this.latest_blocks[contract_name] = block_number;
  }

  /**
   * 
   * @param {string} subscriber 
   * @returns {string}
   */
  async selectAllUnprocessedEventsBySubscriber(
    subscriber
  ) {

    const from_queue = this.events_queue
      .filter(n => n.subscriber === subscriber)
      .map(n => n.event_id);

    const events = this.events.filter(n => from_queue.includes(n.id))

    return events;
  }

  /**
   * 
   * @param {string} id 
   * @param {string} subscriber 
   */
  async setEventProcessedForSubscriber(id, subscriber) {

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

  /**
   * 
   * @param {Array<string>} ids 
   * @returns {Array<string>} filtered ids
   */
  async filterExistingEvents(ids) {

    const exist_ids = this.events.filter(n => {
      return ids.includes(n.id)
    }).map(n => n.id);

    ids = ids.filter(n => !exist_ids.includes(n));

    return ids;
  }

  /**
   * 
   * @param {Array<any>} events 
   * @param {Array<string>} subscribers 
   */
  async saveEvents(events, subscribers) {

    if(!events.length) {
      return;
    }

    events = events.map(n => new Event(n))

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
        ...filtered_events.map(n => new QueueEvent(n, subs.name))
      );
    }
  }
}