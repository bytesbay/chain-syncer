import { IChainSyncerContractsGetterResult, IChainSyncerScanResult } from "@/types";
import { ChainSyncer } from ".";

export const scanContractBlocks = async function(
  this: ChainSyncer,
  contract_getter_result: IChainSyncerContractsGetterResult, 
  contract_name: string, 
  from_block: number, 
  to_block: number
): Promise<IChainSyncerScanResult> {

  let events = await (contract_getter_result.ethers_contract).queryFilter({}, from_block, to_block)

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