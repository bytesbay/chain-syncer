import { ethers as Ethers, Network } from "ethers";
import { Networkish } from "ethers/types/providers";

export type TChainSyncerEventArg = (number | string | boolean); 

export interface IChainSyncerEvent {
  id: string;
  contract: string;
  event: string;
  transaction_hash: string;
  block_number: number;
  log_index: number;
  tx_index: number;
  from_address: string;
  global_index: number;
  block_timestamp: number;
  args: TChainSyncerEventArg[];
}

export interface IChainSyncerSubscriber {
  name: string;
  events: string[];
}

export interface IChainSyncerAdapter {

  getLatestScannedBlockNumber(contract_name: string): Promise<number>;
  removeQueue(subscriber: string, events: string[]): Promise<void>;
  addUnprocessedEventsToQueue(subscriber: string, events: string[]): Promise<void>;
  selectAllSubscribers(): Promise<IChainSyncerSubscriber[]>;

  updateSubscriber(
    subscriber: string, 
    events: string[]
  ): Promise<{ events_added: string[], events_removed: string[] }>;

  saveLatestScannedBlockNumber(contract_name: string, block_number: number): Promise<void>;

  selectAllUnprocessedEventsBySubscriber(
    subscriber: string
  ): Promise<IChainSyncerEvent[]>;

  setEventProcessedForSubscriber(id: string, subscriber: string): Promise<void>;

  filterExistingEvents(ids: string[]): Promise<string[]>;

  saveEvents(events: IChainSyncerEvent[], subscribers: IChainSyncerSubscriber[]): Promise<void>;
}

export interface IChainSyncerContractsResolverResult {
  contract_abi: any[];
  start_block: number;
  address: string;
}

export type TChainSyncerContractsResolverHook = (contract_name: string) => Promise<IChainSyncerContractsResolverResult>;

export interface IChainSyncerLogger {

  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
}

export interface IChainSyncerOptions {

  /**
   * How many safe rescans to repeat before the current rescan
   */
  safe_rescans_to_repeat?: number;

  /**
   * Blocktime of the chain in milliseconds
   */
  block_time: number;

  /**
   * 
   */
  contractsResolver: TChainSyncerContractsResolverHook;

  /**
   * RPC url
   */
  rpc_url: string | string[];

  /**
   * archive RPC url, activates if block range that is requested is too big. If not set, then the default rpc_url will be used
   */
  archive_rpc_url?: string | string[];

  /**
   * How many blocks to query at once
   */
  query_block_limit?: number;

  /**
   * Procissing loop interval
   */
  tick_interval?: number;

  /**
   * 
   */
  mode?: 'mono' | 'scanner';

  /**
   * 
   */
  verbose?: boolean;


  /**
   * 
   */
  safe_rescan_every_n_block?: number;


  /**
   * number of blocks that activates archive rpc
   */
  archive_rpc_activator_edge?: number;


  contracts?: string[];


  logger?: IChainSyncerLogger;


  network_id: number | bigint | string;
}


export interface IChainSyncerScanResult {
  contract_name: string;
  from_block: number;
  to_block: number;
  events: (Ethers.EventLog)[];
  is_need_archive_rpc: boolean;
  contract_getter_result: IChainSyncerContractsResolverResult;
}

export interface IChainSyncerContractsGetterMetadata {
  max_block: number;
  from_block: number;
  to_block: number;
  archive_rpc_advised: boolean;
  for_genesis_tx_lookup: boolean;
}


export interface IChainSyncerEventMetadata {
  from_address: string;
  block_timestamp: number;
  block_number: number;
  transaction_hash: string;
  global_index: number;
}


export interface IChainSyncerGetContractsEventsOptions {
  force_rescan_till?: number;
}

export type TChainSyncerListenerHook = (metadata: IChainSyncerEventMetadata, ...args: TChainSyncerEventArg[]) => Promise<void | boolean> | (void | boolean);

export interface IChainSyncerListener {
  full_event: string;
  listener: TChainSyncerListenerHook;
  contract_name: string;
  event_name: string;
}