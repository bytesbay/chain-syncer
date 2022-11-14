import { addEvents } from "./add-events";
import { addListener } from "./add-listener";
import { updateSubscriber } from "./update-subscriber";
import { getContractEvents } from "./get-contract-events";

import { parseEvent } from "./parse-event";
import { processSubscriberEvents } from "./process-subscriber-events";
import { processingTick } from "./processing-tick";
import { safeRescan } from "./safe-rescan";
import { saveLatestBlocks } from "./save-latest-blocks";
import { scanContractBlocks } from "./scan-contract-blocks";
import { scanContracts } from "./scan-contracts";
import { scannerTick } from "./scanner-tick";
import { syncSubscribers } from "./sync-subscribers";
import { IChainSyncerAdapter, TChainSyncerContractsGetterHook, IChainSyncerLogger, IChainSyncerOptions, IChainSyncerListener, IChainSyncerSubscriber } from "@/types";
import { ethers as Ethers } from "ethers";
import { _loadUsedBlocks, _loadUsedTxs, _parseEventId, _parseListenerName, _uniq } from "./helpers";

export class ChainSyncer {

  listeners: Record<string, IChainSyncerListener> = {}
  used_contracts: string[] = []
  subscribers: IChainSyncerSubscriber[] = []

  _next_safe_at = 0
  _is_started = false
  _is_scanner_busy = false;
  _is_processor_busy = false;
  _current_max_block = 0;

  // syncSubscribers(): Promise<void>;
  // scannerTick(): Promise<void>;
  // processingTick(): Promise<void>;
  // processSubscriberEvents(subscriber: string): Promise<void>;
  // updateSubscriber(subscriber: string, events: string[]): Promise<void>;
  // addEvents(events: IChainSyncerEvent[]): Promise<void>;
  // getContractEvents(contract: Ethers.Contract, from_block: number, to_block: number): Promise<IChainSyncerEvent[]>;
  // saveLatestBlocks(contract_name: string, block_number: number): Promise<void>;
  // scanContractBlocks(contract_name: string, from_block: number, to_block: number): Promise<void>;
  // parseEvent(event: Ethers.Event): IChainSyncerEvent;
  // on(event: string, callback: (event: IChainSyncerEvent) => void): void;
  // scanContracts(): Promise<void>;
  // safeRescan(): Promise<void>;

  addEvents = addEvents;
  parseEvent = parseEvent;
  getContractEvents = getContractEvents;
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
  ethers_provider: Ethers.providers.Provider;
  contractsGetter: TChainSyncerContractsGetterHook;
  verbose: boolean;
  safe_rescan_every_n_block: number;
  logger: IChainSyncerLogger;

  constructor(adapter: IChainSyncerAdapter, opts: IChainSyncerOptions) {

    const {
      tick_interval = 2000,
      query_block_limit = 200,
      safe_rescan_every_n_block = 100,
      mode = 'mono',
      verbose = false,
      contracts = [],
      logger = console,

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
    this.tick_interval = tick_interval;
    this.adapter = adapter;
    this.mode = mode;
    this.ethers_provider = ethers_provider;
    this.contractsGetter = contractsGetter;
    this.verbose = verbose;
    this.safe_rescan_every_n_block = safe_rescan_every_n_block;
    this.logger = logger;
  }


  async start() {

    if(this._is_started) {
      throw new Error('Already started');
    }

    await this.syncSubscribers();

    if(this.mode === 'mono') {
      await this.updateSubscriber('mono', Object.keys(this.listeners));
    }
    
    this.scannerTick();

    if(this.mode === 'mono') {
      this.processingTick();
    }

    this._is_started = true;
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