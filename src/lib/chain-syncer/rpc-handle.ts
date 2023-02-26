import { IChainSyncerEvent, IChainSyncerScanResult } from "@/types";
import * as Ethers from "ethers";
import { JsonRpcProvider, Network } from "ethers";
import { ChainSyncer } from ".";

export const rpcHandle = async function<T>(
  this: ChainSyncer,
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