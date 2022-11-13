import { TChainSyncerListenerHook } from "@/types";
import { ChainSyncer } from ".";

export const addListener = async function(
  this: ChainSyncer,
  event: string, 
  listener: TChainSyncerListenerHook
): Promise<void> {

  if(this.mode !== 'mono') {
    throw new Error('Inline listeners are only available in mono mode');
  }

  if(this._is_started) {
    throw new Error('Unfortunately, you cannot add new listeners after module started');
  }

  const {
    contract_name,
    event_name,
  } = this._parseListenerName(event);

  if(!this.used_contracts.includes(contract_name)) {
    this.used_contracts.push(contract_name);
  }

  this.listeners[event] = {
    full_event: event,
    listener,
    contract_name,
    event_name,
  };
}