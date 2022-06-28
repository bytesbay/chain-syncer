export class QueueEvent {

  /**
   * @type {string}
   */
  id

  /**
   * @type {string}
   */
  event_id

  /**
   * @type {string}
   */
  event

  /**
   * @type {string}
   */
  contract

  /**
   * @type {string}
   */
  subscriber

  constructor(event, subscriber) {
    this.id = event.id + '_' + subscriber;
    this.event_id = event.id;
    this.event = event.event;
    this.contract = event.contract;
    this.subscriber = subscriber;
  }
}