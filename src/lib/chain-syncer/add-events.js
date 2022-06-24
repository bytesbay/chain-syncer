export const addEvents = async function(scans) {

  const merged_events = scans.reduce((acc, n) => {
    return [ ...acc, ...n.events ]
  }, []);

  const used_blocks = await this._loadUsedBlocks(merged_events);
  const used_txs = await this._loadUsedTxs(merged_events);

  const process_events = scans.map(item => item.events.map(event => {
    return this.parseEvent(
      item.contract_name, 
      event, 
      used_blocks.find(n => n.number === event.blockNumber),
      used_txs.find(n => n.hash === event.transactionHash),
    )
  })).reduce((acc, n) => {
    return [ ...acc, ...n ]
  }, []);

  await this.adapter.saveEvents(process_events, Object.keys(this.subscribers));
    
  return process_events;
}