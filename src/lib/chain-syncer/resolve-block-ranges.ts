import { IChainSyncerGetContractsEventsOptions, IChainSyncerScanResult } from "@/types";
import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export const resolveBlockRanges = async function(
  this: ChainSyncer,
  contract_name: string, 
  max_block: number, 
  opts: IChainSyncerGetContractsEventsOptions = {}
): Promise<IChainSyncerScanResult> {

  let from_block = await this.adapter.getLatestScannedBlockNumber(contract_name);

  if(!from_block) {

    const contract = await this.contractsResolver(contract_name);

    if(typeof contract.start_block !== 'number') {
      throw new Error(contract_name + ' has no start_block, skipping ... (see "options.contractsResolver" in https://github.com/bytesbay/chain-syncer#constructoradapter-options)');
    }
    
    from_block = contract.start_block;
  }

  let to_block = from_block + this.query_block_limit;

  if(to_block > max_block) {
    to_block = max_block;
  }

  if(from_block === to_block) {

    if(from_block < 0) {
      from_block = 0;
    }
  }

  if(opts.force_rescan_till) {
    const force_rescan_till = Math.max(0, opts.force_rescan_till);

    if(to_block > force_rescan_till) {
      from_block = force_rescan_till
    } else {
      // nothing to scan
    }
  }

  const contract_getter_result = await this.contractsResolver(contract_name);

  return {
    contract_name,
    from_block,
    to_block,
    contract_getter_result,
    events: [],
  };
}