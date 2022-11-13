import { IChainSyncerScanResult } from "@/types";
import { ChainSyncer } from ".";

export const saveLatestBlocks = async function(
  this: ChainSyncer,
  scans: IChainSyncerScanResult[]
): Promise<void> {
  await Promise.all(
    scans.map(n => this.adapter.saveLatestScannedBlockNumber(n.contract_name, n.block))
  );
}