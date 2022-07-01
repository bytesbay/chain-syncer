export const syncSubscribers = async function() {
  this.subscribers = await this.adapter.selectAllSubscribers();

  const events = this.subscribers.reduce((acc, subscriber) => {
    return acc.concat(subscriber.events);
  }, []);

  events.forEach(event => {
    const { contract_name } = this._parseListenerName(event);
  
    if(!this.used_contracts.includes(contract_name)) {
      this.used_contracts.push(contract_name);
    }
  });
}