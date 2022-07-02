import { addEvents } from "./add-events";
import { addListener } from "./add-listener";
import { updateSubscriber } from "./update-subscriber";
import { getContractEvents } from "./get-contract-events";
import { helpers } from "./helpers";

import { parseEvent } from "./parse-event";
import { processSubscriberEvents } from "./process-subscriber-events";
import { processingTick } from "./processing-tick";
import { safeRescan } from "./safe-rescan";
import { saveLatestBlocks } from "./save-latest-blocks";
import { scanContractBlocks } from "./scan-contract-blocks";
import { scanContracts } from "./scan-contracts";
import { scannerTick } from "./scanner-tick";
import { syncSubscribers } from "./sync-subscribers";

export class ChainSyncer {

  listeners = []
  used_contracts = []
  subscribers = []

  _next_safe_at = 0
  _is_started = false
  _start_sid = 0

  syncSubscribers = syncSubscribers
  scannerTick = scannerTick
  processingTick = processingTick
  processSubscriberEvents = processSubscriberEvents
  updateSubscriber = updateSubscriber
  addEvents = addEvents
  getContractEvents = getContractEvents
  saveLatestBlocks = saveLatestBlocks
  scanContractBlocks = scanContractBlocks
  parseEvent = parseEvent
  on = addListener
  scanContracts = scanContracts
  safeRescan = safeRescan

  constructor(adapter, opts = {}) {

    const {
      tick_interval = 2000,
      query_block_limit = 200,
      query_unprocessed_events_limit = 100,
      blocks_amount_to_activate_archive_rpc = 100,
      safe_rescan_every_n_block = 100,
      mode = 'mono',
      ignore_contracts = [],
      verbose = false,
      contracts = [],
      archive_ethers_provider,

      // required
      block_time,
      contractsGetter,
      ethers_provider,
    } = opts;

    if(query_block_limit < (safe_rescan_every_n_block * 2)) {
      throw new Error('query_block_limit cannot be less than safe_rescan_every_n_block * 2');
    }
  
    if(!contractsGetter) {
      throw new Error('contractsGetter argument is required');
    }
  
    if(!ethers_provider) {
      throw new Error('ethers_provider argument is required');
    }
  
    if(!block_time) {
      throw new Error('block_time argument is required');
    }

    if(contracts.length && mode !== 'scanner') {
      throw new Error('contracts argument are only available in scanner mode');
    }
  
    this.query_block_limit = query_block_limit;
    this.block_time = block_time;
    this.query_unprocessed_events_limit = query_unprocessed_events_limit;
    this.tick_interval = tick_interval;
    this.adapter = adapter;
    this.mode = mode;
    this.ethers_provider = ethers_provider;
    this.archive_ethers_provider = archive_ethers_provider ? archive_ethers_provider : ethers_provider;
    this.contractsGetter = contractsGetter;
    this.ignore_contracts = ignore_contracts;
    this.verbose = verbose;
    this.used_contracts = contracts;
    this.blocks_amount_to_activate_archive_rpc = blocks_amount_to_activate_archive_rpc;
    this.safe_rescan_every_n_block = safe_rescan_every_n_block;

    Object.assign(this, helpers);
  }


  async start() {

    const sid = this._start_sid;

    await this.syncSubscribers();

    if(this.mode === 'mono') {
      await this.updateSubscriber('mono', Object.keys(this.listeners));
    }
    
    if(this.mode === 'mono' || this.mode === 'scanner') {
      this.scannerTick(sid);
    }

    if(this.mode === 'mono') {
      this.processingTick(sid);
    }

    this._is_started = true;
  }


  stop() {
    clearTimeout(this._processing_timeout);
    clearTimeout(this._scanner_timeout);
    this._start_sid++;
  }


  async selectPendingEvents(subscriber) {
    return this.adapter.selectAllUnprocessedEventsBySubscriber(subscriber);
  }


  async markEventsAsProcessed(subscriber, event_ids) {
    await Promise.all(
      event_ids.map(n => this.adapter.setEventProcessedForSubscriber(n, subscriber))
    );
  }
}