export const getContractEvents = async function(contract_name, max_block, opts = {}) {

  let from_block = await this.adapter.getLatestScannedBlockNumber(contract_name);
  const contract = await this.contractsGetter(contract_name, {
    max_block,
    from_block: from_block ? from_block : 0,
  });

  if(!from_block) {

    if(!contract.deployed_transaction_hash) {
      console.error(contract_name, 'has no deploy tx hash', contract.deployed_transaction_hash);
      return;
    }

    try {
      var transaction = await this.ethers_provider
        .getTransaction(contract.deployed_transaction_hash);
    } catch (error) {
      console.error('There\'s a problem fetching contract\'s deploy transaction. TX:', contract.deployed_transaction_hash);
      return;
    }
    
    try {
      from_block = transaction.blockNumber;
    } catch (error) {

      throw new Error(`Looks like you are trying to fetch quite an old tx, check archive_ethers_provider parameter. Error: ${error.message}`);
    }
  }

  let to_block = from_block + this.query_block_limit;

  if(to_block > max_block) {
    to_block = max_block;
  }

  if(from_block === to_block) {

    if(from_block < 0) {
      from_block = 0;
    }
  }

  if(opts.force_rescan_till) {
    const force_rescan_till = Math.max(0, opts.force_rescan_till);

    if(to_block > force_rescan_till) {
      from_block = force_rescan_till
    } else {
      return;
    }
  }

  const res = await this.scanContractBlocks(contract, contract_name, from_block, to_block);

  return res;
}