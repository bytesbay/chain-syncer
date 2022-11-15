import { ChainSyncer } from ".";

export const scannerTick = async function(
  this: ChainSyncer,
) {

  let max_block = 0;

  this._is_scanner_busy = true;

  try {
    max_block = await this.ethers_provider.getBlockNumber();
  } catch (error) {
    this.logger.error('Error while fetching max_block, will try again anyway:', error);
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

  this._is_scanner_busy = false;

  if(this._is_started) {
    setTimeout(() => this.scannerTick(), this.block_time * 1.5)
  }
}