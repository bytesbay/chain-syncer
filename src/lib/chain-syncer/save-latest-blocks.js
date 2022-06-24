export const saveLatestBlocks = async function(scans) {
  await Promise.all(
    scans.map(n => this.adapter.saveLatestScannedBlockNumber(n.contract_name, n.block))
  );
}