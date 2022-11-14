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

export function _parseEventId(this: ChainSyncer, event: Ethers.Event) {
  return event.transactionHash + '_' + event.logIndex
}

export async function _loadUsedBlocks(this: ChainSyncer, events: Ethers.Event[]) {
  const used_blocks = this._uniq(events.map(n => n.blockNumber));

  return await Promise.all(
    used_blocks.map(n => this.ethers_provider.getBlock(n).catch(err => {
      this.logger.error(`getBlock error in ${n} block`);
      return null;
    })).filter(n => n !== null)
  ).then(res => res.filter(n => n !== null) as Ethers.providers.Block[]);
}

export async function _loadUsedTxs(this: ChainSyncer, events: Ethers.Event[]) {
  const used_txs = this._uniq(events.map(n => n.transactionHash));

  return await Promise.all(
    used_txs.map(n => this.ethers_provider.getTransaction(n).catch(err => {
      this.logger.error(`getTransaction error in ${n} tx`);
      return null;
    })).filter(n => n !== null)
  ).then(res => res.filter(n => n !== null) as Ethers.providers.TransactionResponse[]);
}