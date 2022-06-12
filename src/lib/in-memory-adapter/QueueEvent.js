export class QueueEvent {
  constructor(event, subscriber) {
    this.id = event.id + '_' + subscriber;
    this.event_id = event.id;
    this.event = event.event;
    this.contract = event.contract;
    this.subscriber = subscriber;
  }
}