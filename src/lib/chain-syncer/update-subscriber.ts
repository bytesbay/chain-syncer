import { ChainSyncer } from ".";

export const updateSubscriber = async function(
  this: ChainSyncer,
  subscriber: string, 
  events: string[]
): Promise<void> {
  const { events_added, events_removed } = await this.adapter.updateSubscriber(subscriber, events);

  if(events_added.length) {
    await this.adapter.addUnprocessedEventsToQueue(subscriber, events_added)
  }

  if(events_removed.length) {
    await this.adapter.removeQueue(subscriber, events_removed)
  }

  await this.syncSubscribers();
}