import { ethers as Ethers } from "ethers";
import { ChainSyncer } from ".";

export function _uniq<T extends (string | number)>(a: T[]): T[] {

  const seen: Record<T, boolean> = {} as Record<T, boolean>;
  return a.filter(function(item) {
    return seen[item] ? false : (seen[item] = true);
  });
}

export function _parseListenerName(this: ChainSyncer, event: string) {
  const exploded = event.split('.')

  const contract_name = exploded[0];
  const event_name = exploded[1];

  if(!(contract_name || '').length || !(event_name || '').length) {
    throw new Error('Invalid listener format! Must be ContractName.EventName');
  }

  return { contract_name, event_name }
}

export function _parseEventId(this: ChainSyncer, event: Ethers.EventLog) {
  return event.transactionHash + '_' + event.index
}

export async function _loadUsedBlocks(this: ChainSyncer, events: Ethers.EventLog[]) {
  const used_blocks = this._uniq(events.map(n => n.blockNumber));

  return await Promise.all(
    used_blocks.map(n => {

      return this.rpcHandle(async (rpc_url) => {
        const provider = new Ethers.JsonRpcProvider(rpc_url, undefined, {
          polling: false
        });
        return await provider.getBlock(n).catch((err: any) => {
          this.logger.error(`getBlock error in ${n} block`);
          return null;
        })
      }, false);
      
    }).filter(n => n !== null)
  ).then(res => res.filter(n => n !== null) as Ethers.Block[]);
}

export async function _loadUsedTxs(this: ChainSyncer, events: Ethers.EventLog[]) {
  const used_txs = this._uniq(events.map(n => n.transactionHash));

  return await Promise.all(
    used_txs.map(n => {
      return this.rpcHandle(async (rpc_url) => {
        const provider = new Ethers.JsonRpcProvider(rpc_url, undefined, {
          polling: false
        });
        return await provider.getTransaction(n).catch((err: any) => {
          this.logger.error(`getTransaction error in ${n} tx`);
          return null;
        })
      }, false);
    }).filter(n => n !== null)
  ).then(res => res.filter(n => n !== null) as Ethers.TransactionResponse[]);
}