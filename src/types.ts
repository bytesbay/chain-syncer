import { ethers as Ethers } from "ethers";

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
  removeQueue(subscriber: string, events: string[]): Promise<IChainSyncerEvent[]>;
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

  saveEvents(events: IChainSyncerEvent[], subscribers: IChainSyncerSubscriber[]): Promise<string[]>;
}

export interface IChainSyncerContractsGetterResult {
  ethers_contract: Ethers.Contract;
  deploy_transaction_hash: string;
}

export type TChainSyncerContractsGetterHook = (contract_name: string, metadata: IChainSyncerContractsGetterMetadata) => Promise<IChainSyncerContractsGetterResult>;

export interface IChainSyncerLogger {

  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
}

export enum ChainSyncerMode {
  MONO = "mono",
  SCANNER = "multi",
}

export interface IChainSyncerOptions {

  /**
   * Blocktime of the chain in milliseconds
   */
  block_time: number;

  /**
   * 
   */
  contractsGetter: TChainSyncerContractsGetterHook;

  /**
   * EthersJS provider
   */
  ethers_provider: Ethers.providers.Provider;

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
  mode?: ChainSyncerMode;

  /**
   * 
   */
  verbose?: boolean;


  /**
   * 
   */
  safe_rescan_every_n_block?: number;


  contracts?: string[];


  logger?: IChainSyncerLogger;
}


export interface IChainSyncerScanResult {
  contract_name: string;
  // from_block: number;
  // to_block: number;
  events: Ethers.Event[];
  block: number,
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