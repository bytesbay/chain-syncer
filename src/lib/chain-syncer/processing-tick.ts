import { ChainSyncer } from ".";

export const processingTick = async function(
  this: ChainSyncer,
) {
  const proms = [];
  
  this._is_processor_busy = true;

  for (const subs of this.subscribers) {
    proms.push(
      this.processSubscriberEvents(subs.name).catch(() => { /* ... */ })
    );
  }
  await Promise.all(proms);

  this._is_processor_busy = false;

  if(this._is_started) {
    setTimeout(() => this.processingTick(), this.tick_interval);
  }
}