import { IChainSyncerEvent } from "@/types"

export function toEvent(data: IChainSyncerEvent): IEvent {

  return {
    ...data,
    processed_subscribers: {},
  }
}

export interface IEvent extends IChainSyncerEvent {
  processed_subscribers: any;
} 