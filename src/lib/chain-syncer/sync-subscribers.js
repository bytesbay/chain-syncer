export const syncSubscribers = async function() {
  this.subscribers = await this.adapter.selectAllSubscribers();
}