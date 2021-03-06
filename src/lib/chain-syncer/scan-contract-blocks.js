export const scanContractBlocks = async function(contract, contract_name, from_block, to_block) {

  if((to_block - from_block) < 60) {
    var ethers_provider = this.ethers_provider;
  } else {
    var ethers_provider = this.archive_ethers_provider;
  }

  let events = await (contract.inst.connect(ethers_provider)).queryFilter({}, from_block, to_block)

  events = events.filter(n => {
    const event = n;

    // if unknown events (not declared in contract ABI) - just skip
    return event.event && event.args // TODO: filter with streams
  })

  const event_ids = await this.adapter.filterExistingEvents(
    events.map(n => this._parseEventId(n))
  );

  events = events.filter(n => {
    const id = this._parseEventId(n);
    return event_ids.includes(id);
  });
  
  return {
    contract_name,
    events,
    block: to_block,
  }
}