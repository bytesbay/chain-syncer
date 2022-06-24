import { QueueEvent } from "./QueueEvent";

export class InMemoryAdapter {

  latest_blocks = {}
  events = []
  events_queue = []
  subscribers = {}
  
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
    
    const indexes = events.map(n => this.events_queue.findIndex(z => z.event === n && z.subscriber === subscriber))

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
    return { ...this.subscribers };
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
        events: [],
        added_at: {
          ...this.latest_blocks
        }
      };
    }

    const events_added = events.filter(n => !this.subscribers[subscriber].events.includes(n))
    const events_removed = this.subscribers[subscriber].events.filter(n => !events.includes(n))

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

    const from_queue = this.events_queue.filter(n => n.subscriber === subscriber).map(n => n.event_id);

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

      const index = this.events_queue.findIndex(n => n.id !== id && n.subscriber !== subscriber)
      this.events_queue.splice(index, 1);
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

    ids = ids.filter(n => !exist_ids.includes(n))

    return ids;
  }

  /**
   * 
   * @param {Array<any>} events 
   * @param {Array<string>} subscribers 
   */
  async saveEvents(events, subscribers) {

    events = events.map(n => {

      n.processed_subscribers = {};

      if(!n.args) { n.args = []; }

      return n
    })

    const non_exist_ids = this.filterExistingEvents(events.map(n => n.id))
    const events_to_add = events.filter(n => non_exist_ids.includes(n.id))

    this.events.push(...events_to_add);
    
    for (const i in subscribers) {
      this.events_queue.push(
        ...events_to_add.map(n => new QueueEvent(n, subscribers[i]))
      );
    }
  }
}