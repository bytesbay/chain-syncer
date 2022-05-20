export const processStream = async function(key) {
  const { listener, contract_name, event_name, event_stream, full_event } = this.listeners[key];

  // get all unprocessed events by contract and event name
  const events = await this.adapter.selectAllUnprocessedEvents(
    contract_name,
    event_name,
    event_stream,
    this.query_unprocessed_events_limit
  );

  var start = +new Date();  // log start timestamp

  await Promise.all(events.map(async n => {
    const event = n;

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
          console.log('Postponed event', full_event);
        }
        return;
      }
    } catch (error) {
      console.error('Error during stream processing', full_event, error);
      return;
    }

    try {
      await this.adapter.setEventStreamProcessed(event.id, event_stream);
    } catch (error) {
      console.error('Error during event stream state setter', error);
    }
  }))

  var end = +new Date();  // log end timestamp
  // if(end - start > 7000) {
  //   console.warn('Unoptimized stream detected', key, new Date());
  // }
}