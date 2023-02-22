import { addEvents } from "./add-events";
import { addListener } from "./add-listener";
import { updateSubscriber } from "./update-subscriber";
import { resolveBlockRanges } from "./resolve-block-ranges";

import { parseEvent } from "./parse-event";
import { processSubscriberEvents } from "./process-subscriber-events";
import { processingTick } from "./processing-tick";
import { safeRescan } from "./safe-rescan";
import { saveLatestBlocks } from "./save-latest-blocks";
import { scanContractBlocks } from "./scan-contract-blocks";
import { scanContracts } from "./scan-contracts";
import { scannerTick } from "./scanner-tick";
import { syncSubscribers } from "./sync-subscribers";
import { IChainSyncerAdapter, TChainSyncerContractsResolverHook, IChainSyncerLogger, IChainSyncerOptions, IChainSyncerListener, IChainSyncerSubscriber } from "@/types";
import { ethers as Ethers } from "ethers";
import { _loadUsedBlocks, _loadUsedTxs, _parseEventId, _parseListenerName, _uniq } from "./helpers";
import { rpcHandle } from "./rpc-handle";
import { fillScansWithEvents } from "./fill-scans-with-events";

export class ChainSyncer {

  listeners: Record<string, IChainSyncerListener> = {}
  used_contracts: string[] = []
  subscribers: IChainSyncerSubscriber[] = []

  _next_safe_at = 0
  _is_started = false
  _is_scanner_busy = false;
  _is_processor_busy = false;
  _current_max_block = 0;

  addEvents = addEvents;
  parseEvent = parseEvent;
  resolveBlockRanges = resolveBlockRanges;
  saveLatestBlocks = saveLatestBlocks;
  scanContracts = scanContracts;
  scanContractBlocks = scanContractBlocks;
  on = addListener;
  updateSubscriber = updateSubscriber;
  syncSubscribers = syncSubscribers;
  scannerTick = scannerTick;
  safeRescan = safeRescan;
  processingTick = processingTick;
  processSubscriberEvents = processSubscriberEvents;
  rpcHandle = rpcHandle;
  fillScansWithEvents = fillScansWithEvents;

  _uniq = _uniq;
  _parseListenerName = _parseListenerName;
  _parseEventId = _parseEventId;
  _loadUsedBlocks = _loadUsedBlocks;
  _loadUsedTxs = _loadUsedTxs;

  query_block_limit: number;
  block_time: number;
  tick_interval: number;
  adapter: IChainSyncerAdapter;
  mode: string;
  rpc_url: string[];
  contractsResolver: TChainSyncerContractsResolverHook;
  verbose: boolean;
  safe_rescan_every_n_block: number;
  safe_rescans_to_repeat: number;
  logger: IChainSyncerLogger;
  archive_rpc_url: string[];
  archive_rpc_activator_edge: number;

  constructor(adapter: IChainSyncerAdapter, opts: IChainSyncerOptions) {

    const {
      tick_interval = 2000,
      query_block_limit = 200,
      safe_rescan_every_n_block = 5,
      safe_rescans_to_repeat = 2,
      mode = 'mono',
      verbose = false,
      contracts = [],
      logger = console,
      archive_rpc_url = [],
      archive_rpc_activator_edge = 1000,

      // required
      block_time,
      contractsResolver,
      rpc_url,
    } = opts;

    if(query_block_limit < (safe_rescan_every_n_block * safe_rescans_to_repeat)) {
      throw new Error('query_block_limit cannot be less than safe_rescan_every_n_block * safe_rescans_to_repeat');
    }
  
    if(!contractsResolver) {
      throw new Error('contractsResolver argument is required');
    }
  
    if(!rpc_url) {
      throw new Error('rpc_url argument is required');
    }
  
    if(!block_time) {
      throw new Error('block_time argument is required');
    }

    if(contracts.length && mode !== 'scanner') {
      throw new Error('contracts argument are only available in scanner mode');
    }

    this.archive_rpc_url = Array.isArray(archive_rpc_url) ? archive_rpc_url : [ archive_rpc_url ];
    this.archive_rpc_activator_edge = archive_rpc_activator_edge;
    this.query_block_limit = query_block_limit;
    this.block_time = block_time;
    this.tick_interval = tick_interval;
    this.adapter = adapter;
    this.mode = mode;
    this.rpc_url = !Array.isArray(rpc_url) ? [ rpc_url ] : rpc_url;
    this.contractsResolver = contractsResolver;
    this.verbose = verbose;
    this.safe_rescan_every_n_block = safe_rescan_every_n_block;
    this.safe_rescans_to_repeat = safe_rescans_to_repeat;
    this.logger = logger;
  }


  async scannerLoop() {
    while(this._is_started) {
      this._is_scanner_busy = true;
      await this.scannerTick();
      await new Promise(resolve => setTimeout(() => resolve(0), this.block_time * 1.5));
      this._is_scanner_busy = false;
    }
  }



  async processingLoop() {
    while(this._is_started) {
      this._is_processor_busy = true;
      await this.processingTick();
      await new Promise(resolve => setTimeout(() => resolve(0), this.tick_interval));
      this._is_processor_busy = false;
    }
  }


  async start() {

    if(this._is_started) {
      throw new Error('Already started');
    }

    await this.syncSubscribers();

    if(this.mode === 'mono') {
      await this.updateSubscriber('mono', Object.keys(this.listeners));
    }

    this._is_started = true;
    
    this.scannerLoop();

    if(this.mode === 'mono') {
      this.processingLoop();
    }
  }


  async stop() {
    this._is_started = false;

    let interval: any;
    await new Promise(resolve => {
      interval = setInterval(() => {
        if(!this._is_scanner_busy && !this._is_processor_busy) {
          clearInterval(interval);
          resolve(undefined);
        }
      }, 500);
    })
  }


  async selectPendingEvents(subscriber: string) {
    return this.adapter.selectAllUnprocessedEventsBySubscriber(subscriber);
  }


  async markEventsAsProcessed(subscriber: string, event_ids: string[]) {
    await Promise.all(
      event_ids.map(n => this.adapter.setEventProcessedForSubscriber(n, subscriber))
    );
  }
}