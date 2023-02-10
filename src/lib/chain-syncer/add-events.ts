import { IChainSyncerEvent, IChainSyncerScanResult } from "@/types";
import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export const addEvents = async function(
  this: ChainSyncer, 
  scans: IChainSyncerScanResult[]
): Promise<IChainSyncerEvent[]> {

  const merged_events = scans.reduce((acc, n) => {
    return [ ...acc, ...n.events ]
  }, [] as Ethers.EventLog[]);

  const used_blocks = await this._loadUsedBlocks(merged_events);
  const used_txs = await this._loadUsedTxs(merged_events);

  const process_events = scans.map(item => item.events.map(event => {

    const block = used_blocks.find(n => n.number === event.blockNumber);
    const tx = used_txs.find(n => n.hash === event.transactionHash);

    if(!block) {
      throw new Error(`Block ${event.blockNumber} not found!`);
    }

    if(!tx) {
      throw new Error(`Tx ${event.transactionHash} not found!`);
    }

    return this.parseEvent(
      item.contract_name, 
      event, 
      block,
      tx,
    )
  })).reduce((acc, n) => {
    return [ ...acc, ...n ]
  }, []);

  await this.adapter.saveEvents(process_events, this.subscribers);
    
  return process_events;
}