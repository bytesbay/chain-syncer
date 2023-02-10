import { IChainSyncerEvent, IChainSyncerScanResult } from "@/types";
import * as Ethers from "ethers";
import { ChainSyncer } from ".";

export const fillScansWithEvents = async function(
  this: ChainSyncer,
  scans: IChainSyncerScanResult[]
): Promise<void> {

  const aggregatedFilling = (scans: IChainSyncerScanResult[], from_block: number, to_block: number) => {

    return this.rpcHandle(async (rpc_url: string) => {
      const provider = new Ethers.JsonRpcProvider(rpc_url, undefined, {
        polling: false
      });
  
      const contract_names = scans.map(n => n.contract_name)
  
      // get event names from this.subscribers
      const event_names = this.subscribers.map(n => n.events).reduce((acc, n) => {
        return [ ...acc, ...n ]
      }, [] as string[]).filter(n => {
        return contract_names.includes(n.split(".")[0]);
      });
  
      // get topics from event names
      const topics = event_names.map(n => {
        const contract_name = n.split(".")[0];
        const event_name = n.split(".")[1];
  
        const result = scans.find(n => n.contract_name === contract_name)?.contract_getter_result;
  
        if(!result) {
          throw new Error(`Internal. Contract ${contract_name} not found!`);
        }
        
        const ethers_contract = new Ethers.Contract(
          result.address,
          result.contract_abi,
          provider
        );
  
        const e = ethers_contract.interface.getEvent(event_name);
  
        if(!e) {
          throw new Error(`Internal. Event ${event_name} not found!`);
        }
  
        return e.topicHash;
      });
  
      const logs = await provider.getLogs({
        address: grouped_scans.map(n => n.contract_getter_result.address),
        // only unique topics
        topics: topics.filter((n, i) => topics.indexOf(n) === i),
        fromBlock: Ethers.toBeHex(from_block),
        toBlock: Ethers.toBeHex(to_block),
      }) || [];
  
      const event_logs = logs.filter(n => !n.removed).map(n => {

        const scan = grouped_scans.find(z => z.contract_getter_result.address === n.address);

        if(!scan) {
          throw new Error(`Internal. Contract ${n.address} not found!`);
        }

        const contract = new Ethers.Contract(
          scan?.contract_getter_result.address,
          scan?.contract_getter_result.contract_abi,
          provider
        );

        const description = contract.interface.parseLog({
          topics: [ ...n.topics ],
          data: n.data,
        });

        if(!description || !description.name) {
          throw new Error(`Internal. Malformed description!`);
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

      });

      const event_ids = await this.adapter.filterExistingEvents(
        event_logs.map(n => this._parseEventId(n))
      );
    
      return event_logs.filter(n => {
        const id = this._parseEventId(n);
        return event_ids.includes(id);
      });

    }, false)
  }

  // get the highest to_block from scans
  const highest_to_block = scans.reduce((acc, n) => {
    return n.to_block > acc ? n.to_block : acc;
  }, 0);
 
  const grouped_scans = scans.filter(n => {
    return n.to_block === highest_to_block && n.to_block - n.from_block <= this.archive_rpc_activator_edge;
  });

  // get lowest from_block from grouped_scans
  const lowest_from_block_from_grouped_scans = grouped_scans.length ? grouped_scans.reduce((acc, n) => {
    return n.from_block < acc ? n.from_block : acc;
  }, Infinity) : highest_to_block;

  const ungrouped_scans = scans.filter(n => {
    return n.to_block !== highest_to_block || n.to_block - n.from_block > this.archive_rpc_activator_edge;
  });  

  const proms = [];

  proms.push(aggregatedFilling(grouped_scans, lowest_from_block_from_grouped_scans, highest_to_block));

  proms.push(...ungrouped_scans.map(n => {
    return aggregatedFilling([ n ], n.from_block, n.to_block);
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