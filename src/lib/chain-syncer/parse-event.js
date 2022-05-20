const padIndex = num => {
  return num.toString().padStart(10, '0')
}

export const parseEvent = function(contract_name, event, block, tx) {

  if(!tx) {
    console.error('Event has no tx, trying to fetch again (problem with RPC)');
  }

  const opts = {
    id: this._parseEventId(event),
    contract: contract_name, 
    event: event.event,
    transaction_hash: event.transactionHash,
    block_number: event.blockNumber,
    log_index: event.logIndex,
    tx_index: event.transactionIndex,
    from_address: tx.from,
    global_index: Number(event.blockNumber.toString() + padIndex(event.logIndex)),
  };

  const traverseParse = (n) => {
    if(Array.isArray(n)) {
      return n.map(z => traverseParse(z))
    } else {
      if(n._isBigNumber) {
        return n.toString();
      } else {
        return n;
      }
    }
  }

  const args = traverseParse(event.args);

  return {
    ...opts,
    block_timestamp: block.timestamp,
    args: args,
  };
}