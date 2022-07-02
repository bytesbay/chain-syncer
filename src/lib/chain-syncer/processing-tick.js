export const processingTick = async function(sid) {
  const proms = [];
  
  for (const i in this.subscribers) {
    const subs = this.subscribers[i];
    proms.push(
      this.processSubscriberEvents(subs.name).catch(err => console.error(err))
    );
  }
  await Promise.all(proms);

  if(this._start_sid === sid) {
    this._processing_timeout = setTimeout(() => this.processingTick(sid), this.tick_interval);
  }
}