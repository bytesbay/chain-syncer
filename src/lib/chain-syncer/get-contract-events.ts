import { IChainSyncerGetContractsEventsOptions, IChainSyncerScanResult } from "@/types";
import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export const getContractEvents = async function(
  this: ChainSyncer,
  contract_name: string, 
  max_block: number, 
  opts: IChainSyncerGetContractsEventsOptions = {}
): Promise<IChainSyncerScanResult> {

  let from_block = await this.adapter.getLatestScannedBlockNumber(contract_name);

  if(!from_block) {

    const contract = await this.contractsGetter(contract_name, {
      max_block,
      from_block: 0,
      to_block: max_block,
      archive_rpc_advised: true,
      for_genesis_tx_lookup: true,
    });

    if(!contract.deploy_transaction_hash) {
      throw new Error(contract_name + ' has no deploy tx hash, skipping ...');
    }

    let transaction: Ethers.providers.TransactionResponse;

    try {
      transaction = await this.ethers_provider
        .getTransaction(contract.deploy_transaction_hash);
    } catch (error) {
      throw new Error('There\'s a problem fetching contract\'s deploy transaction. TX: ' + contract.deploy_transaction_hash);
    }

    if(!transaction || !transaction.blockNumber) {
      throw new Error('Deploy transaction has no block number. TX: ' + contract.deploy_transaction_hash);
    }
    
    from_block = transaction.blockNumber;
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
      throw new Error('Nothing to scan');
    }
  }

  const contract = await this.contractsGetter(contract_name, {
    max_block,
    to_block,
    from_block,
    archive_rpc_advised: max_block - (from_block || 0) > 50,
    for_genesis_tx_lookup: false,
  });

  const res = await this.scanContractBlocks(contract, contract_name, from_block, to_block);

  return res;
}