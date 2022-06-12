export const processingTick = async function() {
  const proms = [];
  
  for (const key in this.subscribers) {
    proms.push(this.processSubscriberEvents(key).catch(err => console.error(err)));
  }
  await Promise.all(proms);

  this._processing_timeout = setTimeout(() => this.processingTick(), this.tick_interval);
}