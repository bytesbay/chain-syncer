// Generated by dts-bundle v0.7.3
// Dependencies for this module:
//   ../ethers
//   ../@/types

import { ethers as Ethers, JsonRpcProvider } from "ethers";
import { IChainSyncerAdapter, TChainSyncerContractsResolverHook, IChainSyncerLogger, IChainSyncerOptions, IChainSyncerListener, IChainSyncerSubscriber, IChainSyncerScanResult, IChainSyncerEvent, IChainSyncerGetContractsEventsOptions, TChainSyncerListenerHook } from "@/types";
import { IChainSyncerAdapter, IChainSyncerEvent, IChainSyncerSubscriber } from "@/types";
import { ethers as Ethers } from "ethers";
import { IChainSyncerEvent } from "@/types";

export default ChainSyncer;
export { ChainSyncer, InMemoryAdapter };

export class ChainSyncer {
    listeners: Record<string, IChainSyncerListener>;
    used_contracts: string[];
    subscribers: IChainSyncerSubscriber[];
    cached_providers: Record<string, JsonRpcProvider>;
    cached_contracts: Record<string, Ethers.Contract>;
    blocked_providers: Record<string, number>;
    batch_max_count: number;
    _next_safe_at: number;
    _is_started: boolean;
    _is_scanner_busy: boolean;
    _is_processor_busy: boolean;
    _current_max_block: number;
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
    parseEvent(contract_name: string, event: Ethers.EventLog, block: Ethers.Block, tx: Ethers.TransactionResponse): IChainSyncerEvent;
    resolveBlockRanges(contract_name: string, max_block: number, opts?: IChainSyncerGetContractsEventsOptions): Promise<IChainSyncerScanResult>;
    saveLatestBlocks(scans: IChainSyncerScanResult[]): Promise<void>;
    scanContracts(max_block: number, opts?: IChainSyncerGetContractsEventsOptions): Promise<{
        scans: IChainSyncerScanResult[];
        events: IChainSyncerEvent[];
    }>;
    on(event: string, listener: TChainSyncerListenerHook): Promise<void>;
    updateSubscriber(subscriber: string, events: string[]): Promise<void>;
    syncSubscribers(): Promise<void>;
    scannerTick(): Promise<void>;
    safeRescan(max_block: number): Promise<void>;
    processingTick(): Promise<void>;
    processSubscriberEvents(subscriber: string): Promise<void>;
    rpcHandle<T>(handler: (rpc_provider: JsonRpcProvider) => Promise<T>, archive_preferred?: boolean): Promise<T>;
    fillScansWithEvents(scans: IChainSyncerScanResult[]): Promise<void>;
    constructor(adapter: IChainSyncerAdapter, opts: IChainSyncerOptions);
    scannerLoop(): Promise<void>;
    processingLoop(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    selectPendingEvents(subscriber: string): Promise<IChainSyncerEvent[]>;
    markEventsAsProcessed(subscriber: string, event_ids: string[]): Promise<void>;
    addEvents(scans: IChainSyncerScanResult[]): Promise<IChainSyncerEvent[]>;
    _uniq<T extends (string | number)>(a: T[]): T[];
    _parseListenerName(event: string): {
        contract_name: string;
        event_name: string;
    };
    _parseEventId(event: Ethers.EventLog): string;
    _loadUsedBlocks(events: Ethers.EventLog[]): Promise<Ethers.Block[]>;
    _loadUsedTxs(events: Ethers.EventLog[]): Promise<Ethers.TransactionResponse[]>;
}

interface ISubscriber {
    name: string;
    events: string[];
    added_at: Record<string, number>;
}
export class InMemoryAdapter implements IChainSyncerAdapter {
    latest_blocks: Record<string, number>;
    events: IEvent[];
    events_queue: IQueueEvent[];
    subscribers: Record<string, ISubscriber>;
    _is_chainsyncer_adapter: boolean;
    constructor();
    getLatestScannedBlockNumber(contract_name: string): Promise<number>;
    removeQueue(subscriber: string, events: string[]): Promise<void>;
    addUnprocessedEventsToQueue(subscriber: string, events: string[]): Promise<void>;
    selectAllSubscribers(): Promise<ISubscriber[]>;
    updateSubscriber(subscriber: string, events: string[]): Promise<{
        events_added: string[];
        events_removed: string[];
    }>;
    saveLatestScannedBlockNumber(contract_name: string, block_number: number): Promise<void>;
    selectAllUnprocessedEventsBySubscriber(subscriber: string): Promise<IEvent[]>;
    setEventProcessedForSubscriber(id: string, subscriber: string): Promise<void>;
    filterExistingEvents(ids: string[]): Promise<string[]>;
    saveEvents(_events: IChainSyncerEvent[], subscribers: IChainSyncerSubscriber[]): Promise<void>;
}
export {};

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
        updateSubscriber(subscriber: string, events: string[]): Promise<{
                events_added: string[];
                events_removed: string[];
        }>;
        saveLatestScannedBlockNumber(contract_name: string, block_number: number): Promise<void>;
        selectAllUnprocessedEventsBySubscriber(subscriber: string): Promise<IChainSyncerEvent[]>;
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

export function toEvent(data: IChainSyncerEvent): IEvent;
export interface IEvent extends IChainSyncerEvent {
    processed_subscribers: any;
}

export function toQueueEvent(event: IEvent, subscriber: string): IQueueEvent;
export interface IQueueEvent {
    id: string;
    event_id: string;
    event: string;
    contract: string;
    subscriber: string;
}

