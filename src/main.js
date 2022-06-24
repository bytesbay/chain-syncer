import { ChainSyncer, InMemoryAdapter } from './lib';

import { ethers as Ethers } from 'ethers';

const test = async () => {

  // Connection to MetaMask wallet
  const provider = new Ethers.providers.JsonRpcProvider('https://bscrpc.com')

  const contracts = {
    'BUSD': {
      inst: new Ethers.Contract('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', require('@/abis/BUSD.json'), provider),
      deployed_transaction_hash: '0x0f01fc521030f178115c880e200b09a40c9510f49de227aa880276f92670a3d6'
    }
  }

  window.adapter = new InMemoryAdapter();
  window.syncer = new ChainSyncer(window.adapter, {

    verbose: true,
    ethers_provider: provider,
    block_time: 3500,

    query_block_limit: 200,
    query_unprocessed_events_limit: 2,

    async contractsGetter(contract_name) {
      const item = contracts[contract_name];
      return {
        inst: item.inst,
        deployed_transaction_hash: item.deployed_transaction_hash,
      };
    },
  });

  let volume = 0;

  window.syncer.on('BUSD.Transfer', (
    from,
    to,
    amount,
    { block_number, transaction_hash, global_index, from_address }
  ) => {

    amount = Ethers.utils.formatEther(amount) // format from wei
    volume += Number(amount);

    console.log('Transfer', amount);
  });

  window.syncer.on('BUSD.Approval', (
    address,
    amount,
    { block_number, transaction_hash, global_index, from_address }
  ) => {
    console.log('Approval', Ethers.utils.formatEther(amount), address);
  });

  await window.syncer.start();
}

document.querySelector('#btn').addEventListener('click', () => test())