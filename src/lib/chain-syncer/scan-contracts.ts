import { IChainSyncerEvent, IChainSyncerGetContractsEventsOptions, IChainSyncerScanResult } from "@/types";
import { ChainSyncer } from ".";

export const scanContracts = async function(
  this: ChainSyncer,
  max_block: number, 
  opts: IChainSyncerGetContractsEventsOptions = {}
) {

  const proms = [];
  
  const _contracts = this.used_contracts;

  for (const i in _contracts) {
    const contract_name = _contracts[i];

    const prom = this.getContractEvents(contract_name, max_block, opts)
      .catch(err => {
        this.logger.error(`Error in gethering events for contract ${contract_name}:`, err);
        return null;
      });

    proms.push(prom);
  }

  let scans: IChainSyncerScanResult[] = [];
  let events: IChainSyncerEvent[] = [];

  if(proms.length) {
    scans = await Promise.all(proms).then(data => data.filter(n => n) as IChainSyncerScanResult[]);
    events = await this.addEvents(scans);
  }

  return { scans, events };

}