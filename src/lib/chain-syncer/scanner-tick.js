export const scannerTick = async function() {

  try {
    var max_block = await this.ethers_provider.getBlockNumber();
  } catch (error) {
    console.error('Error while fetching max_block, will try again anyway:', error ? error.message : 'Unknown error');
  }

  if(max_block >= 0) {
    try {

      const { scans, events } = await this.scanContracts(max_block);

      if(!scans.length) {
        if(this.verbose) {
          console.log(`[MAXBLOCK: ${max_block}]`, 'No scans executed');
        }
      } else {
    
        await this.saveLatestBlocks(scans);
    
        if(this.verbose) {
          console.log(`[MAXBLOCK: ${max_block}]`, events.length, 'events added');
        }

        await this.safeRescan(max_block);
      }

    } catch (error) {
      console.error('Error in scanner', error);
    }
  }

  if(this._scanner_timeout !== false) {
    this._scanner_timeout = setTimeout(() => this.scannerTick(), this.block_time)
  }
}