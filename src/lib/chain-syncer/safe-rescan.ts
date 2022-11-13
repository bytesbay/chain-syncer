import { ChainSyncer } from ".";

export const safeRescan = async function(
  this: ChainSyncer,
  max_block: number
): Promise<void> {

  if(max_block < this._next_safe_at) {
    return;
  }

  max_block = max_block - 1; // we dont need the latest

  const force_rescan_till = max_block - (this.safe_rescan_every_n_block * 2);

  const { scans, events } = await this.scanContracts(max_block, {
    force_rescan_till,
  });

  this._next_safe_at = max_block + this.safe_rescan_every_n_block;

  if(this.verbose) {
    this.logger.log('Safe rescan ...', events.length, 'events added. Next rescan at', this._next_safe_at);
  }
}