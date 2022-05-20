export const processEvents = async function(data) {

  const merged_events = data.reduce((acc, n) => {
    return [ ...acc, ...n.events ]
  }, []);

  const used_blocks = await this._loadUsedBlocks(merged_events);
  const used_txs = await this._loadUsedTxs(merged_events);

  const process_events = data.map(item => item.events.map(event => {
    return this.parseEvent(
      item.contract_name, 
      event, 
      used_blocks.find(n => n.number === event.blockNumber),
      used_txs.find(n => n.hash === event.transactionHash),
    )
  })).reduce((acc, n) => {
    return [ ...acc, ...n ]
  }, []);

  await this.adapter.saveEvents(process_events);
    
  return process_events;
}