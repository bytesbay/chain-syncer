import { IChainSyncerEvent, IChainSyncerGetContractsEventsOptions, IChainSyncerScanResult } from "@/types";
import { ChainSyncer } from ".";

export const scanContracts = async function(
  this: ChainSyncer,
  max_block: number, 
  opts: IChainSyncerGetContractsEventsOptions = {}
) {

  const proms = [];
  
  const _contracts = this.used_contracts;  

  // getting blocks and aggregating the blocks that needs to be scanned
  for (const i in _contracts) {
    const contract_name = _contracts[i];

    const prom = this.resolveBlockRanges(contract_name, max_block, opts)
      .catch((err: any) => {
        this.logger.error(`Error in gethering events for contract ${contract_name}: ${err.message}`);
        return null;
      });

    proms.push(prom);
  }

  // now we same ranges of blocks to the same group
  // and we scan them in parallel

  const scans = await Promise
    .all(proms)
    .then(data => data.filter(n => n) as IChainSyncerScanResult[]);

  await this.fillScansWithEvents(scans);

  let events: IChainSyncerEvent[] = [];
  if(proms.length) {
    events = await this.addEvents(scans);
  }

  return { scans, events };

}