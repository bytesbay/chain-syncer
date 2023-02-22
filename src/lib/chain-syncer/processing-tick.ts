import { ChainSyncer } from ".";

export const processingTick = async function(
  this: ChainSyncer,
) {
  const proms = [];

  for (const subs of this.subscribers) {
    proms.push(
      this.processSubscriberEvents(subs.name).catch(() => { /* ... */ })
    );
  }
  await Promise.all(proms);
}