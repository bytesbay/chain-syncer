const padIndex = (num: number) => {
  return num.toString().padStart(6, '0')
}

import { IChainSyncerEvent, TChainSyncerEventArg } from "@/types";
import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export const parseEvent = function(
  this: ChainSyncer,
  contract_name: string, 
  event: Ethers.EventLog, 
  block: Ethers.Block, 
  tx: Ethers.TransactionResponse
): IChainSyncerEvent {

  const opts = {
    id: this._parseEventId(event),
    contract: contract_name, 
    event: event.eventName || 'unknown',
    transaction_hash: event.transactionHash,
    block_number: event.blockNumber,
    log_index: event.index,
    tx_index: event.transactionIndex,
    from_address: tx.from,
    global_index: Number(event.blockNumber.toString() + padIndex(event.index)),
  };

  // @ts-ignore
  const traverseParse = (n) => {
    if(Array.isArray(n)) {
      // @ts-ignore
      return n.map(z => traverseParse(z))
    } else {
      if(n._isBigNumber) {
        return n.toString();
      } else {
        return n;
      }
    }
  }

  const args: TChainSyncerEventArg[] = traverseParse(event.args || []);

  return {
    ...opts,
    block_timestamp: block.timestamp,
    args: args,
  };
}