export const helpers = {
  
  _uniq(a) {
    let seen = {};
    return a.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
  },

  _parseListenerName(event) {
    const exploded = event.replace(/\#.*$/, '').split('.')

    const contract_name = exploded[0];
    const event_name = exploded[1];

    if(!(contract_name || '').length || !(event_name || '').length) {
      throw new Error('Invalid listener format! Must be ContractName.EventName');
    }

    return { contract_name, event_name }
  },

  _parseEventId(event) {
    return event.transactionHash + '_' + event.logIndex
  },

  async _loadUsedBlocks(events) {
    let used_blocks = this._uniq(events.map(n => n.blockNumber));

    used_blocks = await Promise.all(
      used_blocks.map(n => this.ethers_provider.getBlock(n).catch(err => {
        console.error(`getBlock error in ${n} block`);
        return null;
      }))
    );

    used_blocks = used_blocks.filter(n => n);

    return used_blocks;
  },

  async _loadUsedTxs(events) {
    let used_txs = this._uniq(events.map(n => n.transactionHash));

    used_txs = await Promise.all(
      used_txs.map(n => this.ethers_provider.getTransaction(n).catch(err => {
        console.error(`getTransaction error in ${n} tx`);
        return null;
      }))
    );

    used_txs = used_txs.filter(n => n);

    return used_txs;
  },
}