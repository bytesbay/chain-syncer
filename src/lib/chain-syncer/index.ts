import { ethers as Ethers, Contract, JsonRpcProvider, Network } from "ethers";
import { IChainSyncerAdapter, TChainSyncerContractsResolverHook, IChainSyncerLogger, IChainSyncerOptions, IChainSyncerListener, IChainSyncerSubscriber, IChainSyncerScanResult, IChainSyncerEvent, TChainSyncerEventArg, IChainSyncerGetContractsEventsOptions, IChainSyncerContractsResolverResult, TChainSyncerListenerHook } from "@/types";

export class ChainSyncer {

  listeners: Record<string, IChainSyncerListener> = {}
  used_contracts: string[] = []
  subscribers: IChainSyncerSubscriber[] = []

  cached_providers: Record<string, JsonRpcProvider> = {}
  cached_contracts = {} as Record<string, Contract>

  _next_safe_at = 0
  _is_started = false
  _is_scanner_busy = false;
  _is_processor_busy = false;
  _current_max_block = 0;

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
  network_id: number | bigint | string;

  parseEvent(
    contract_name: string, 
    event: Ethers.EventLog, 
    block: Ethers.Block, 
    tx: Ethers.TransactionResponse
  ): IChainSyncerEvent {
  
    const padIndex = (num: number) => {
      return num.toString().padStart(6, '0')
    }
  
    const opts = {
      id: this._parseEventId(event),
      contract: contract_name, 
      event: event.eventName || 'unknown',
      transaction_hash: event.transactionHash,
      block_number: event.blockNumber,
      log_index: event.index,
      tx_index: event.transactionIndex,
      from_address: tx.from,
      global_index: Number(event.blockNumber.toString() + padIndex(event.index)),
    };
  
    // @ts-ignore
    const traverseParse = (n) => {
      if(Array.isArray(n)) {
        // @ts-ignore
        return n.map(z => traverseParse(z))
      } else {
        if(typeof n === 'bigint') {
          return n.toString();
        } else {
          return n;
        }
      }
    }
  
    const args: TChainSyncerEventArg[] = traverseParse(event.args || []);
  
    return {
      ...opts,
      block_timestamp: block.timestamp,
      args: args,
    };
  }

  async resolveBlockRanges(
    contract_name: string, 
    max_block: number, 
    opts: IChainSyncerGetContractsEventsOptions = {}
  ): Promise<IChainSyncerScanResult> {
  
    let from_block = await this.adapter.getLatestScannedBlockNumber(contract_name);
  
    if(!from_block) {
  
      const contract = await this.contractsResolver(contract_name);
  
      if(typeof contract.start_block !== 'number') {
        throw new Error(contract_name + ' has no start_block, skipping ... (see "options.contractsResolver" in https://github.com/bytesbay/chain-syncer#constructoradapter-options)');
      }
      
      from_block = contract.start_block;
    }
  
    let to_block = from_block + this.query_block_limit;
  
    if(to_block > max_block) {
      to_block = max_block;
    }
  
    if(from_block === to_block) {
  
      if(from_block < 0) {
        from_block = 0;
      }
    }
  
    if(opts.force_rescan_till) {
      const force_rescan_till = Math.max(0, opts.force_rescan_till);
  
      if(to_block > force_rescan_till) {
        from_block = force_rescan_till
      } else {
        // nothing to scan
      }
    }
  
    const contract_getter_result = await this.contractsResolver(contract_name);

    const is_need_archive_rpc = (to_block < (max_block - this.archive_rpc_activator_edge)) || (from_block < (max_block - this.archive_rpc_activator_edge));
  
    return {
      contract_name,
      from_block,
      to_block,
      is_need_archive_rpc,
      contract_getter_result,
      events: [],
    };
  }

  async saveLatestBlocks(
    scans: IChainSyncerScanResult[]
  ): Promise<void> {
    await Promise.all(
      scans.map(n => this.adapter.saveLatestScannedBlockNumber(n.contract_name, n.to_block))
    );
  }

  async scanContracts(
    max_block: number, 
    opts: IChainSyncerGetContractsEventsOptions = {}
  ) {
  
    const proms = [];
    
    const _contracts = this.used_contracts;  
  
    // getting blocks and aggregating the blocks that needs to be scanned
    for (const i in _contracts) {
      const contract_name = _contracts[i];
  
      const prom = this.resolveBlockRanges(contract_name, max_block, opts)
        .catch((err: any) => {
          this.logger.error(`Error in gethering events for contract ${contract_name}: ${err.message}`);
          return null;
        });
  
      proms.push(prom);
    }
  
    // now we same ranges of blocks to the same group
    // and we scan them in parallel
  
    const scans = await Promise
      .all(proms)
      .then(data => data.filter(n => n) as IChainSyncerScanResult[]);
  
    await this.fillScansWithEvents(scans);
  
    let events: IChainSyncerEvent[] = [];
    if(proms.length) {
      events = await this.addEvents(scans);
    }
  
    return { scans, events };
  
  }

  async on(
    event: string, 
    listener: TChainSyncerListenerHook
  ): Promise<void> {
  
    if(this.mode !== 'mono') {
      throw new Error('Inline listeners are only available in mono mode');
    }
  
    if(this._is_started) {
      throw new Error('Unfortunately, you cannot add new listeners after module started');
    }
  
    const {
      contract_name,
      event_name,
    } = this._parseListenerName(event);
  
    if(!this.used_contracts.includes(contract_name)) {
      this.used_contracts.push(contract_name);
    }
  
    this.listeners[event] = {
      full_event: event,
      listener,
      contract_name,
      event_name,
    };
  }

  async updateSubscriber(
    subscriber: string, 
    events: string[]
  ): Promise<void> {
    const { events_added, events_removed } = await this.adapter.updateSubscriber(subscriber, events);
  
    if(events_added.length) {
      await this.adapter.addUnprocessedEventsToQueue(subscriber, events_added)
    }
  
    if(events_removed.length) {
      await this.adapter.removeQueue(subscriber, events_removed)
    }
  
    await this.syncSubscribers();
  }

  async syncSubscribers(

  ): Promise<void> {
    this.subscribers = await this.adapter.selectAllSubscribers();
  
    const events = this.subscribers.reduce((acc, subscriber) => {
      return acc.concat(subscriber.events);
    }, [] as string[]);
  
    events.forEach(event => {
      const { contract_name } = this._parseListenerName(event);
    
      if(!this.used_contracts.includes(contract_name)) {
        this.used_contracts.push(contract_name);
      }
    });
  }

  async scannerTick(

  ) {

    let max_block = 0;

    try {
      max_block = await this.rpcHandle(async (provider) => {
        return await provider.getBlockNumber();
      }, false);
    } catch (error) {
      this.logger.error('Error while fetchaing max_block, will try again anyway:', error);
    }

    if(max_block >= 0) {
      try {

        const { scans, events } = await this.scanContracts(max_block);

        if(!scans.length) {
          
          if(this.verbose) {
            this.logger.log(`[MAXBLOCK: ${max_block}] No scans executed`);
          }
        } else {
      
          await this.saveLatestBlocks(scans);
      
          if(this.verbose) {
            this.logger.log(`[MAXBLOCK: ${max_block}] ${events.length} events added`);
          }

          await this.safeRescan(max_block);
        }

      } catch (error) {
        this.logger.error('Error in scanner', error);
      }
    }
  }

  async safeRescan(
    max_block: number
  ): Promise<void> {

    if(max_block < this._next_safe_at) {
      return;
    }

    max_block = max_block - 1; // we dont need the latest

    const force_rescan_till = max_block - (this.safe_rescan_every_n_block * this.safe_rescans_to_repeat);

    const { scans, events } = await this.scanContracts(max_block, {
      force_rescan_till,
    });

    this._next_safe_at = max_block + this.safe_rescan_every_n_block;

    if(this.verbose) {
      this.logger.log(`Safe rescan ... ${events.length} events added. Next rescan at ${this._next_safe_at} block`);
    }
  }

  async processingTick(

  ) {
    const proms = [];

    for (const subs of this.subscribers) {
      proms.push(
        this.processSubscriberEvents(subs.name).catch(() => { /* ... */ })
      );
    }
    await Promise.all(proms);
  }

  async processSubscriberEvents(
    subscriber: string
  ): Promise<void> {

    const parseListenerName = (e: IChainSyncerEvent): string => {
      return `${e.contract}.${e.event}`
    }

    // get all unprocessed events by contract and event name
    let events = await this.adapter.selectAllUnprocessedEventsBySubscriber(
      subscriber
    );

    events = events.filter(n => this.listeners[parseListenerName(n)])

    await Promise.all(events.map(async n => {
      const event = n;

      const listener_name = parseListenerName(event);

      const { listener } = this.listeners[listener_name];

      try {
        const res = await listener({
          block_number: event.block_number,
          transaction_hash: event.transaction_hash,
          block_timestamp: event.block_timestamp,
          global_index: event.global_index,
          from_address: event.from_address,
        }, ...event.args);

        if(res === false) {
          if(this.verbose) {
            this.logger.log(`Postponed event ${listener_name}`);
          }
          return;
        }
      } catch (error) {
        this.logger.error(`Error during event processing ${listener_name}`, error);
        return;
      }

      try {
        await this.adapter.setEventProcessedForSubscriber(event.id, subscriber);
      } catch (error) {
        this.logger.error('Error during event stream state setter', error);
      }
    }))
  }

  async rpcHandle<T>(
    handler: (rpc_provider: JsonRpcProvider) => Promise<T>,
    archive_preferred = false
  ): Promise<T> {
  
    if(archive_preferred && !this.archive_rpc_url.length) {
      archive_preferred = false;
    }

    let index = 0;
    
    const rpc_urls = archive_preferred ? this.archive_rpc_url : this.rpc_url;

    let handler_res: T;

    for (const rpc_url of rpc_urls) {
      try {

        if(!this.cached_providers[rpc_url]) {
          
          this.cached_providers[rpc_url] = new Ethers.JsonRpcProvider(rpc_url, this.network_id, {
            polling: false,
          });

          // @ts-ignore
          this.cached_providers[rpc_url]._detectNetwork = async () => {
            return new Network('-', this.network_id);
          };
        }

        handler_res = await handler(this.cached_providers[rpc_url]);
        break;
      } catch (error) {
        index++;
        if(index === rpc_urls.length) {
          throw error;
        }
      }
    }

    // @ts-ignore
    return handler_res;
  }

  async fillScansWithEvents(
    scans: IChainSyncerScanResult[]
  ): Promise<void> {

    const aggregatedFilling = (
      scans: IChainSyncerScanResult[], 
      from_block: number, 
      to_block: number,
      is_need_archive_rpc: boolean
    ) => {

      return this.rpcHandle(async (provider) => {
        
        const logs = await provider.getLogs({
          address: scans.map(n => n.contract_getter_result.address),
          fromBlock: Ethers.toBeHex(from_block),
          toBlock: Ethers.toBeHex(to_block),
        }) || [];
    
        const event_logs = logs.filter(n => !n.removed).map(n => {

          const scan = scans.find(z => z.contract_getter_result.address === n.address);

          if(!scan) {
            throw new Error(`Internal. Contract ${n.address} not found!`);
          }

          if(!this.cached_contracts[scan.contract_name]) {
            this.cached_contracts[scan.contract_name] = new Ethers.Contract(
              scan?.contract_getter_result.address,
              scan?.contract_getter_result.contract_abi,
              provider
            );
          }
          
          const contract = this.cached_contracts[scan.contract_name];

          const description = contract.interface.parseLog({
            topics: [ ...n.topics ],
            data: n.data,
          });        

          if(!description || !description.name) {
            return null;
          }
          
          const fragment = contract.interface.getEvent(description.name);

          if(!fragment) {
            throw new Error(`Internal. Malformed fragment!`);
          }

          const event = new Ethers.EventLog(
            n,
            contract.interface,
            fragment
          );

          return event;

        }).filter(n => n !== null) as Ethers.EventLog[];

        const event_ids = await this.adapter.filterExistingEvents(
          event_logs.map(n => this._parseEventId(n))
        );
      
        return event_logs.filter(n => {
          const id = this._parseEventId(n);
          return event_ids.includes(id);
        });

      }, is_need_archive_rpc)
    }

    // get the highest to_block from scans
    const highest_to_block = scans.reduce((acc, n) => {
      return n.to_block > acc ? n.to_block : acc;
    }, 0);
  
    const grouped_scans = scans.filter(n => {
      return n.to_block === highest_to_block;
    });

    // get lowest from_block from grouped_scans
    const lowest_from_block_from_grouped_scans = grouped_scans.length ? grouped_scans.reduce((acc, n) => {
      return n.from_block < acc ? n.from_block : acc;
    }, Infinity) : highest_to_block;

    const ungrouped_scans = scans.filter(n => {
      return n.to_block !== highest_to_block;
    });  

    const proms = [];

    proms.push(
      aggregatedFilling(
        grouped_scans, 
        lowest_from_block_from_grouped_scans, 
        highest_to_block, 
        grouped_scans[0].is_need_archive_rpc
      )
    );

    proms.push(...ungrouped_scans.map(n => {
      return aggregatedFilling([ n ], n.from_block, n.to_block, n.is_need_archive_rpc);
    }));

    const result = await Promise.all(proms);

    const events = result.reduce((acc, n) => {
      return [ ...acc, ...n ];
    }, [] as Ethers.EventLog[]);  
    
    // add events to scans
    scans.forEach(n => {
      n.events = events.filter(z => {
        return z.address === n.contract_getter_result.address;
      });
    });
    
  }

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
      network_id,
    } = opts;

    if (query_block_limit < (safe_rescan_every_n_block * safe_rescans_to_repeat)) {
      throw new Error('query_block_limit cannot be less than safe_rescan_every_n_block * safe_rescans_to_repeat');
    }

    if (!contractsResolver) {
      throw new Error('contractsResolver argument is required');
    }

    if (!rpc_url) {
      throw new Error('rpc_url argument is required');
    }

    if (!block_time) {
      throw new Error('block_time argument is required');
    }

    if (contracts.length && mode !== 'scanner') {
      throw new Error('contracts argument are only available in scanner mode');
    }

    this.archive_rpc_url = Array.isArray(archive_rpc_url) ? archive_rpc_url : [archive_rpc_url];
    this.archive_rpc_activator_edge = archive_rpc_activator_edge;
    this.query_block_limit = query_block_limit;
    this.block_time = block_time;
    this.tick_interval = tick_interval;
    this.adapter = adapter;
    this.mode = mode;
    this.rpc_url = !Array.isArray(rpc_url) ? [rpc_url] : rpc_url;
    this.contractsResolver = contractsResolver;
    this.verbose = verbose;
    this.safe_rescan_every_n_block = safe_rescan_every_n_block;
    this.safe_rescans_to_repeat = safe_rescans_to_repeat;
    this.logger = logger;
    this.network_id = network_id;
  }


  async scannerLoop() {
    while (this._is_started) {
      this._is_scanner_busy = true;
      await this.scannerTick();
      await new Promise(resolve => setTimeout(() => resolve(0), this.block_time * 1.5));
      this._is_scanner_busy = false;
    }
  }



  async processingLoop() {
    while (this._is_started) {
      this._is_processor_busy = true;
      await this.processingTick();
      await new Promise(resolve => setTimeout(() => resolve(0), this.tick_interval));
      this._is_processor_busy = false;
    }
  }


  async start() {

    if (this._is_started) {
      throw new Error('Already started');
    }

    await this.syncSubscribers();

    if (this.mode === 'mono') {
      await this.updateSubscriber('mono', Object.keys(this.listeners));
    }

    this._is_started = true;

    this.scannerLoop();

    if (this.mode === 'mono') {
      this.processingLoop();
    }
  }


  async stop() {
    this._is_started = false;

    let interval: any;
    await new Promise(resolve => {
      interval = setInterval(() => {
        if (!this._is_scanner_busy && !this._is_processor_busy) {
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


  async addEvents(
    scans: IChainSyncerScanResult[]
  ): Promise<IChainSyncerEvent[]> {

    const merged_events = scans.reduce((acc, n) => {
      return [...acc, ...n.events]
    }, [] as Ethers.EventLog[]);

    const used_blocks = await this._loadUsedBlocks(merged_events);
    const used_txs = await this._loadUsedTxs(merged_events);

    const process_events = scans.map(item => item.events.map(event => {

      const block = used_blocks.find(n => n.number === event.blockNumber);
      const tx = used_txs.find(n => n.hash === event.transactionHash);

      if (!block) {
        throw new Error(`Block ${event.blockNumber} not found!`);
      }

      if (!tx) {
        throw new Error(`Tx ${event.transactionHash} not found!`);
      }

      return this.parseEvent(
        item.contract_name,
        event,
        block,
        tx,
      )
    })).reduce((acc, n) => {
      return [...acc, ...n]
    }, []);

    await this.adapter.saveEvents(process_events, this.subscribers);

    return process_events;
  }

  // ----- HELPERS -----

  _uniq<T extends (string | number)>(a: T[]): T[] {

    const seen: Record<T, boolean> = {} as Record<T, boolean>;
    return a.filter(function(item) {
      return seen[item] ? false : (seen[item] = true);
    });
  }

  _parseListenerName(event: string) {
    const exploded = event.split('.')

    const contract_name = exploded[0];
    const event_name = exploded[1];

    if(!(contract_name || '').length || !(event_name || '').length) {
      throw new Error('Invalid listener format! Must be ContractName.EventName');
    }

    return { contract_name, event_name }
  }

  _parseEventId(event: Ethers.EventLog) {
    return event.transactionHash + '_' + event.index
  }

  async _loadUsedBlocks(events: Ethers.EventLog[]) {
    const used_blocks = this._uniq(events.map(n => n.blockNumber));
  
    return await Promise.all(
      used_blocks.map(n => {
  
        return this.rpcHandle(async (provider) => {
          return await provider.getBlock(n).catch((err: any) => {
            this.logger.error(`getBlock error in ${n} block`);
            return null;
          })
        }, false);
        
      }).filter(n => n !== null)
    ).then(res => res.filter(n => n !== null) as Ethers.Block[]);
  }
  
  async _loadUsedTxs(events: Ethers.EventLog[]) {
    const used_txs = this._uniq(events.map(n => n.transactionHash));
  
    return await Promise.all(
      used_txs.map(n => {
        return this.rpcHandle(async (provider) => {
          return await provider.getTransaction(n).catch((err: any) => {
            this.logger.error(`getTransaction error in ${n} tx`);
            return null;
          })
        }, false);
      }).filter(n => n !== null)
    ).then(res => res.filter(n => n !== null) as Ethers.TransactionResponse[]);
  }
}