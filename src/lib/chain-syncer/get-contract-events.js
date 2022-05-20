export const getContractEvents = async function(contract_name, max_block) {

  

  let from_block = await this.adapter.getLatestUnprocessedBlockNumber(contract_name);
  const contract = await this.contractsGetter(contract_name);

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
    from_block = transaction.blockNumber;
  }

  let to_block = from_block + this.query_block_limit;

  if(to_block > max_block) {
    to_block = max_block;
  }

  if(from_block === to_block) {

    // for local env
    if(from_block < 0) {
      from_block = 0;
    }
  }

  const res = await this.scanContractBlocks(contract, contract_name, from_block, to_block);

  return res;
}