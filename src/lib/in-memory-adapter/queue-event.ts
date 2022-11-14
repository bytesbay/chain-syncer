import { IEvent } from "./event";

export function toQueueEvent(event: IEvent, subscriber: string): IQueueEvent {

  return {
    id: event.id + '_' + subscriber,
    event_id: event.id,
    event: event.event,
    contract: event.contract,
    subscriber: subscriber,
  }
}

export interface IQueueEvent {
  id: string;
  event_id: string;
  event: string;
  contract: string;
  subscriber: string;
} 