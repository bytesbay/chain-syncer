import { IChainSyncerContractsResolverResult, IChainSyncerScanResult } from "@/types";
import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export const scanContractBlocks = async function(
  this: ChainSyncer,
  contract_getter_result: IChainSyncerContractsResolverResult, 
  contract_name: string, 
  from_block: number, 
  to_block: number
): Promise<IChainSyncerScanResult> {

  let events = [] as Ethers.EventLog[];

  events = events.filter(n => {
    const event = n;

    // if unknown events (not declared in contract ABI) - just skip
    return event.eventName && event.args // TODO: filter with streams
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
    contract_getter_result,
    events,
    from_block: from_block,
    to_block: to_block,
  }
}