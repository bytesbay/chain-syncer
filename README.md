<!-- ![Project Presentation](https://github.com/bytesbay/web3-token/raw/main/resources/logo.jpg "Web3 Token") -->

# Chain Syncer

Chain Syncer is a module which allows you to synchronize your app with any ethereum-compatible blockchain/contract state. Fast. Realtime. Reliable.

---
## Install

Works only with [ethers](https://www.npmjs.com/package/ethers) package, so don't forget to install it:

```bash
$ npm i chain-syncer ethers
```

---

## Example usage

Using [Ethers](https://www.npmjs.com/package/ethers) package:

```js
const { ChainSyncer, InMemoryAdapter } = require('chain-syncer');

const default_adapter_which_you_need_to_change_to_any_other = new InMemoryAdapter();

const ethersjs_provider = new Ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545'); // BSC testnet rpc

const contracts = {
  'Items': {
    abi: [ /* ... */ ],
    network: {
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 
      deployed_transaction: '0x0f01fc521030f178115c880e200b09a40c9510f49de227aa880276f92670a3d6'
    }
  }
}

const syncer = new ChainSyncer(default_adapter_which_you_need_to_change_to_any_other, {

  tick_interval: 3000,
  
  query_block_limit: 1000,
  
  verbose: true,
  
  block_time: 3500,
  
  ethers_provider: ethersjs_provider,
  
  async contractsGetter(contract_name) {
    const contract = contracts[contract_name];
    return {
      inst: new Ethers.Contract(contract.network.address, contract.abi, ethersjs_provider),
      deployed_transaction_hash: contract.network.deployed_transaction,
    };
  },
});

syncer.start();

syncer.on('Items.Transfer#default-stream', async (
  from, 
  to, 
  token_id, 
  { global_index, from_address, block_number, block_timestamp, transaction_hash }
) => {

  // global_index is a uniq id of event which is created from block number and logIndex padded with zeros

  const item = await Item.findOne({ _id: token_id });

  if(!item) { // postpone until item created
    return false;
  }

  item.owner = to;
  item.updatedAt = new Date(block_timestamp * 1000);
  await item.save();
  
  // Best practise is doing something like that, so you are sure that you have the latest state of 'owner' field
  //
  // await Item.updateOne({
  //   _id: token_id,
  //   'syncdata.owner': { $lt: global_index }
  // }, {
  //   'syncdata.owner': global_index,
  //   owner: to,
  // })
  
  // you can notify user that he has new items
}));

```

<!-- ## Advanced usage with options (Client&Server side)
```js

// I assume here a lot of things to be imported 😀

const token = await Web3Token.sign(async msg => await signer.signMessage(msg), {
  domain: 'worldofdefish.com',
  statement: 'I accept the WoD Terms of Service: https://service.org/tos',
  expire_in: '3 days',
  // won't be able to use this token for one hour
  not_before: new Date(Date.now() + (3600 * 1000)),
  nonce: 11111111,
});

const { address, body } = await Web3Token.verify(token, {
  // verify that received token is signed only for our domain
  domain: 'worldofdefish.com'
});

``` -->

---

## API

### constructor(adapter, options)
Name | Description | Required | Example
--- | --- | --- | ---
`adapter` | An adapter interface for storing event data. As a test you can use built-in `InMemoryAdapter`, but better build your own adapter to any DB. | `required` | `new InMemoryAdapter()`
`options` | An options object | `required` | -
`options.tick_interval` | determinates how often will process unprocessed events | `optional` (default: `2000`) | `3000` (every 3 seconds)
`options.query_block_limit` | Maximum amount of blocks that can be scanned per tick. For example official BSC RPC allows up to 2000 blocks per request. | `optional` (default: `100`) | `2000`
`options.query_unprocessed_events_limit` | Maximum amount of events that can be scanned per tick | `optional` (default: `100`) | `5000`
`options.verbose` | A flag which enables debug mode and logging | `optional` (default: `false`) | `true`
`options.mode` | Module mode. Possible: `'events'` or `'processing'` or `'universal'`. `'events'` mode only scans events without processing. `'processing'` mode is only processing new events. `'universal'` doing both. | `optional` (default: `'universal'`) | `'processing'`
`options.block_time` | Block time of a network you are working with. For example `3500` for BSC. | `required` | `3500` (BSC network)
`options.ethers_provider` | Ethers.js provider | `required` | `new Ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545')`
`options.contractsGetter` | An async function that returns object with ethers.js contract instance and tx hash of its deploy | `required` | `async () => ({ inst: new Ethers.Contract(contracts[contract_name].network.address, contracts[contract_name].abi, ethersjs_provider), deployed_transaction_hash: contracts[contract_name].network.deployed_transaction })`


### on(stream_name, listener)
Name | Description | Required | Example
--- | --- | --- | ---
`stream_name` | Steam name is a string which contains contract, event and stream id (actually just id of this listener if you have microservices for example) | `required` | `'Items.Transfer#default-stream'`
`listener` | Listener function, last argument is always object of event parameters. If `false` returned from listener - event will be postponed till next processing tick | `required` | `async ({ global_index, from_address, block_number, block_timestamp, transaction_hash }) => { ... }`

### start()
Starts scanner and processor

---

## License
Chain Syncer is released under the MIT license. © 2022 Miroslaw Shpak
