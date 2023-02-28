import { IChainSyncerEvent } from "@/types";
import { ChainSyncer } from ".";

export const processSubscriberEvents = async function(
  this: ChainSyncer,
  subscriber: string
): Promise<void> {

  const parseListenerName = (e: IChainSyncerEvent): string => {
    return `${e.contract}.${e.event}`
  }

  // get all unprocessed events by contract and event name
  let events = await this.adapter.selectAllUnprocessedEventsBySubscriber(
    subscriber
  );

  events = events.filter(n => this.listeners[parseListenerName(n)])

  await Promise.all(events.map(async n => {
    const event = n;

    const listener_name = parseListenerName(event);

    const { listener } = this.listeners[listener_name];

    try {
      const res = await listener({
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        block_timestamp: event.block_timestamp,
        global_index: event.global_index,
        from_address: event.from_address,
      }, ...event.args);

      if(res === false) {
        if(this.verbose) {
          this.logger.log(`Postponed event ${listener_name}`);
        }
        return;
      }
    } catch (error) {
      this.logger.error(`Error during event processing ${listener_name}`, error);
      return;
    }

    try {
      await this.adapter.setEventProcessedForSubscriber(event.id, subscriber);
    } catch (error) {
      this.logger.error('Error during event stream state setter', error);
    }
  }))
}