import { ChainSyncer } from ".";
import * as Ethers from "ethers";

export const scannerTick = async function(
  this: ChainSyncer,
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