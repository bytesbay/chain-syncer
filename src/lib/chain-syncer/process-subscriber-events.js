const parseListenerName = (e) => {
  return `${e.contract}.${e.event}`
}

export const processSubscriberEvents = async function(subscriber) {

  // get all unprocessed events by contract and event name
  let events = await this.adapter.selectAllUnprocessedEventsBySubscriber(
    subscriber
  );

  events = events.filter(n => !!this.listeners[parseListenerName(n)])

  await Promise.all(events.map(async n => {
    const event = n;

    const listener_name = parseListenerName(event);

    const { listener } = this.listeners[listener_name];

    try {
      const res = await listener(...event.args, {
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        block_timestamp: event.block_timestamp,
        global_index: event.global_index,
        from_address: event.from_address,
      });

      if(res === false) {
        if(this.verbose) {
          console.log('Postponed event', listener_name);
        }
        return;
      }
    } catch (error) {
      console.error('Error during event processing', listener_name, error);
      return;
    }

    try {
      await this.adapter.setEventProcessedForSubscriber(event.id, subscriber);
    } catch (error) {
      console.error('Error during event stream state setter', error);
    }
  }))
}