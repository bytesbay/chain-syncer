export const processingTick = async function() {
  const proms = [];
  
  for (const key in this.subscribers) {
    proms.push(this.processSubscriberEvents(key).catch(err => console.error(err)));
  }
  await Promise.all(proms);

  if(this._processing_timeout !== false) {
    this._processing_timeout = setTimeout(() => this.processingTick(), this.tick_interval);
  }
}