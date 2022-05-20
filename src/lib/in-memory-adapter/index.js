export const InMemoryAdapter = function() {
  
  this.latest_blocks = {};
  this.events = [];

  this.getLatestUnprocessedBlockNumber = function(contract_name) {

    const item = this.latest_blocks[contract_name];

    if(item) {
      return item;
    }
    
    return 0;
  }

  this.saveLatestUnprocessedBlockNumber = function(contract_name, block_number) {
    this.latest_blocks[contract_name] = block_number;
  }

  this.selectAllUnprocessedEvents = function(
    contract,
    event,
    stream,
    limit,
  ) {

    const res = this.events.filter(n => {
      return n.contract === contract && n.event === event && !n.processed_streams.includes(stream)
    });

    res.sort((a, b) => {
      return a.block_number - b.block_number
    });

    return res;
  }

  this.setEventStreamProcessed = function(id, stream) {

    const item = this.events.find(n => n.id === id);

    if(item) {
      item.processed_streams.push(stream);
    }
  }

  this.filterExistingEvents = function(ids) {

    const exist_ids = this.events.filter(n => {
      return ids.includes(n.id)
    }).map(n => n.id);

    ids = ids.filter(n => !exist_ids.includes(n))

    return ids;
  }

  this.archiveData = function(edge_block = 0) {

    // TODO

  }

  this.saveEvents = function(objects) {

    objects = objects.map(n => {

      n.processed_streams = [];

      if(!n.args) { n.args = []; }

      return n
    })

    const non_exist_ids = this.filterExistingEvents(objects.map(n => n.id))

    this.events.push(...objects.filter(n => non_exist_ids.includes(n.id)));
  }
}