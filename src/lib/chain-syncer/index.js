import { parseEvent } from './parse-event';
import { processEvents } from './process-events';
import { processStream } from './process-stream';
import { getContractEvents } from './get-contract-events';
import { scanContractBlocks } from './scan-contract-blocks';

export const ChainSyncer = function(adapter, opts = {}) {

  const {
    tick_interval = 2000,
    query_block_limit = 100,
    query_unprocessed_events_limit = 100,
    block_time,
    mode = 'universal',
    contractsGetter,
    ethers_provider,
    ignore_contracts = [],
    verbose = false,
  } = opts;

  if(!contractsGetter) {
    throw new Error('contractsGetter is required');
  }

  if(!ethers_provider) {
    throw new Error('ethers_provider is required');
  }

  if(!block_time) {
    throw new Error('block_time is required');
  }

  this.listeners = {};
  this._used_contracts = [];

  this.query_block_limit = query_block_limit;
  this.block_time = block_time;
  this.query_unprocessed_events_limit = query_unprocessed_events_limit;
  this.tick_interval = tick_interval;
  this.adapter = adapter;
  this.mode = mode;
  this.ethers_provider = ethers_provider;
  this.contractsGetter = contractsGetter;
  this.ignore_contracts = ignore_contracts;
  this.verbose = verbose;

  this.processStream = processStream.bind(this);
  this.parseEvent = parseEvent.bind(this);
  this.getContractEvents = getContractEvents.bind(this);
  this.scanContractBlocks = scanContractBlocks.bind(this);
  this.processEvents = processEvents.bind(this);

  this.on = async function(event, listener) {

    const {
      contract_name,
      event_name,
      event_stream,
    } = this._parseListenerName(event);

    if(!this._used_contracts.includes(contract_name)) {
      this._used_contracts.push(contract_name);
    }

    this.listeners[event] = {
      full_event: event,
      listener,
      contract_name,
      event_name,
      event_stream,
    };
  }

  function _uniq(a) {
    let seen = {};
    return a.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
  }

  this._parseListenerName = function(event) {
    const exploded = event.replace(/\#.*$/, '').split('.')

    const contract_name = exploded[0];
    const event_name = exploded[1];
    const event_stream = event.split('#')[1];

    if(!(contract_name || '').length || !(event_name || '').length || !(event_stream || '').length) {
      throw new Error('Invalid listener format! Must be ContractName.EventName#stream-id');
    }

    return { contract_name, event_name, event_stream }
  }

  this._parseEventId = function(event) {
    return event.transactionHash + '_' + event.logIndex
  }

  this._loadUsedBlocks = async function(events) {
    let used_blocks = _uniq(events.map(n => n.blockNumber));

    used_blocks = await Promise.all(
      used_blocks.map(n => this.ethers_provider.getBlock(n).catch(err => {
        console.error(`getBlock error in ${n} block`);
        return null;
      }))
    );

    used_blocks = used_blocks.filter(n => n);

    return used_blocks;
  }

  this._loadUsedTxs = async function(events) {
    let used_txs = _uniq(events.map(n => n.transactionHash));

    used_txs = await Promise.all(
      used_txs.map(n => this.ethers_provider.getTransaction(n).catch(err => {
        console.error(`getTransaction error in ${n} tx`);
        return null;
      }))
    );

    used_txs = used_txs.filter(n => n);

    return used_txs;
  }

  // TODO: remove later
  this.archiveUnusedData = async function() {
    try {
      const max_block = await this.ethers_provider.getBlockNumber();
      await this.adapter.archiveData(max_block - parseInt((3600 * 1000) / this.block_time));
    } catch (error) {
      console.log('Error while fetching max block in archive operation');
    }
  }

  this.stop = function() {
    // TODO
  }

  this.start = function() {
    
    if(this.mode === 'universal' || this.mode === 'events') {
      this.onSafeTick();
      this.onEventsTick();
    }


    if(this.mode === 'universal' || this.mode === 'processing') {
      this.onProcessingTick();
    }

  }

  this.onEventsTick = async function() {

    try {
      var max_block = await this.ethers_provider.getBlockNumber();
    } catch (error) {
      console.error('Error while fetching max_block, will try again anyway:', error ? error.message : 'Unknown error');
    }

    if(max_block) {
      try {
        let proms = [];

        const _contracts = this._used_contracts.filter(n => !this.ignore_contracts.includes(n))

        for (const i in _contracts) {
          const contract_name = _contracts[i];
          proms.push(
            this.getContractEvents(contract_name, max_block)
              .catch(err => {
                console.error('Error in gethering events for contract', `${contract_name}:`, err.message);
                return null;
              })
          );
        }

        proms = proms.filter(n => n !== null);

        if(!proms.length) {
          console.log(`[MAXBLOCK: ${max_block}]`, 'No contracts to process');
        } else {
          const data = await Promise.all(proms).then(data => data.filter(n => n));

          const events = await this.processEvents(data);

          await Promise.all(
            data.map(n => this.adapter.saveLatestUnprocessedBlockNumber(n.contract_name, n.block))
          );

          if(this.verbose) {
            console.log(`[MAXBLOCK: ${max_block}]`, 'Defualt tick ... ', events.length, 'events added');
          }
        } 
      } catch (error) {
        console.error('Error in default tick', error);
      }
    }

    this._events_timeout = setTimeout(() => this.onEventsTick(), this.block_time / 2)
  }

  this.onProcessingTick = async function() {

    const proms = [];
    for (const key in this.listeners) {
      proms.push(this.processStream(key).catch(err => console.error(err)));
    }
    await Promise.all(proms);

    this._processing_timeout = setTimeout(() => {
      this.onProcessingTick()
    }, this.tick_interval);
  }

  this.onSafeTick = async function() {

    const blocks_span = 40;

    this._safe_timeout = setTimeout(() => {
      this.onSafeTick()
    }, this.block_time * blocks_span)

    try {
      var max_block = await this.ethers_provider.getBlockNumber();
    } catch (error) {
      console.error('Error while fetching max_block, will try again anyway.', error.message);
    }

    if(max_block) {
      try {
        const proms = [];

        const _contracts = this._used_contracts.filter(n => !this.ignore_contracts.includes(n))

        for (const i in _contracts) {
          const contract_name = _contracts[i];
          const contract = await this.contractsGetter(contract_name);

          const from_block = max_block - (blocks_span * 2);
          const to_block = max_block;

          proms.push(
            this.scanContractBlocks(contract, contract_name, from_block, to_block).catch(err => {
              console.error('Error in gethering events for contract:', err.message);
              return null;
            })
          );
        }

        const data = await Promise.all(proms).then(data => data.filter(n => n));

        const events = await this.processEvents(data);

        if(this.verbose) {
          console.log('Safe tick ...', events.length, 'events added');
        }
      } catch (error) {
        console.error('Error in safe tick', error);
      }
    }
  }
}