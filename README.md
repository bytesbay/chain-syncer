![Project Presentation](https://github.com/bytesbay/chain-syncer/raw/main/resources/logo.jpg "Chain Syncer")

# Chain Syncer

ChainSyncer is a module that helps synchronize a backend with a blockchain by catching on-chain events and writing them immediately to the database. This is more flexible than storing all data on-chain or off-chain because it allows for a hybrid approach that simplifies development of decentralized applications (dApps).

- [What problem does this module solve?](https://medium.com/@bytesbay/say-hello-to-a-custom-server-in-your-dapp-17b8f4d64093)

- [Cookbook](https://medium.com/@bytesbay/chainsyncer-cookbook-76f29285fdeb)

## Updates

- 3.0.0 - Project codebase moved to Typescript. Also some naming changes.

- 4.0.0 - Reworked reliablity and speed of the module. Now it is much faster and more reliable. If some of the RPCs are down - it will automatically switch to another one. Also ChainSyncer now tries to batch load events from the blockchain. This allows to reduce the number of RPC calls and speed up the process. And the last one - Chain Syncer moved to [Ethers V6](https://docs.ethers.org/v6/)

---
## Install

Works only with [ethers v6](https://www.npmjs.com/package/ethers) package, so don't forget to install it:

```bash
$ npm i chain-syncer ethers@^6.0.0
```

---

## Example usage

Using [Ethers](https://www.npmjs.com/package/ethers) package:

```js
const { ChainSyncer, InMemoryAdapter } = require('chain-syncer');

const default_adapter = new InMemoryAdapter(); // change it to any other adapter

const contracts = {
  'Items': {
    abi: [ /* ... ABI of the contract that is generated after build (using truffle, for example) */ ],
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    start_block: 27118825 // scanner will start from this block
  }
}

const syncer = new ChainSyncer(default_adapter, {

  tick_interval: 3000,
  
  query_block_limit: 1000,
  
  verbose: true,
  
  block_time: 3500,
  
  rpc_url: 'https://data-seed-prebsc-1-s1.binance.org:8545',

  network_id: 97, // BSC testnet
  
  async contractsResolver(contract_name) {
    return contracts[contract_name];
  },
});

syncer.on('Items.Transfer', async (
  { global_index, from_address, block_number, block_timestamp, transaction_hash },
  from, 
  to, 
  token_id,
) => {

  // global_index is a uniq id of event which is created from block number and logIndex padded with zeros
  // example - if block_number is 234 and logIndex of the event is 4 so global_index will be 234000004

  const item = await Item.findOne({ _id: token_id });

  if(!item) { // postpone until item created locally
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

await syncer.start();

```

---

## API

### constructor(adapter, options)
Name | Description | Required | Example
--- | --- | --- | ---
`adapter` | An adapter interface for storing event data. As a test you can use built-in `InMemoryAdapter`, but better build your own adapter to any DB. | `required` | `new InMemoryAdapter()`
`options` | An options object | `required` | -
`options.tick_interval` | determinates how often will process unprocessed events | `optional` (default: `2000`) | `3000` (every 3 seconds)
`options.query_block_limit` | Maximum amount of blocks that can be scanned per tick. For example official BSC RPC allows up to 2000 blocks per request. | `optional` (default: `100`) | `2000`
`options.verbose` | A flag which enables debug mode and logging | `optional` (default: `false`) | `true`
`options.mode` | Module mode. Possible: `'mono'` or `'scanner'`. `'mono'` mode is made for monolith applications - processing and scanning happens on the same app. `'scanner'` mode is made for microservices arch - app is only scanning for new events, processing happens on the client nodes (currently we are building client package, but dont be shy to contribute) | `optional` (default: `'mono'`) | `'scanner'`
`options.block_time` | Block time of a network you are working with. For example `3500` for BSC. | `required` | `3500` (BSC network)
`options.rpc_url` | RPC url that is used to get blockchain data. If array of urls is passed - it will work as fallback urls. | `required` | `'https://data-seed-prebsc-1-s1.binance.org:8545'` or `[ 'https://bscrpc.com', 'https://bscrpc2.com', 'https://bscrpc3.com' ]`
`options.contractsResolver` | An async function that returns object with ethers.js contract instance and tx hash of its deploy | `required` | `async () => ({ contract_abi: contracts[contract_name].abi, start_block: 20304005, address: contracts[contract_name].network.address })`
`options.safe_rescan_every_n_block` | Because of unreliability of most of the RPCs, the syncer may miss some events from the latest blocks, so the syncer will rescan previous `options.safe_rescan_every_n_block * 2` blocks every `options.safe_rescan_every_n_block` block. | `optional`: (default: `100`) | `50`


### on(event, listener)

⚠️ MUST BE CALLED ONLY BEFORE SYNCER STARTS

Name | Description | Required | Example
--- | --- | --- | ---
`event` | Event is a string which contains contract and event | `required` | `'Items.Transfer'`
`listener` | Listener function (handler), last argument is always object of event parameters. If `false` returned from listener - event will be postponed till next processing tick | `required` | `async ({ global_index, from_address, block_number, block_timestamp, transaction_hash }, ...event_args) => { ... }`

### start()
Starts scanner and processor


### stop()
Stops scanner and processor

---

## Available storage adapters

MongoDB - [@chainsyncer/mongodb-adapter](https://github.com/hereWasKitus/chainsyncer-mongodb-adapter)

Please feel free to help with all possible adapter (for Postgres, MySQL etc...)

Contact with me if you want @chainsyncer/* namespace in NPM.

## FAQ

### How to use Chain Syncer for multiple networks?

Chain Syncer is not designed to work with multiple networks at the same time. You can use it for multiple networks, but you have to create separate instance of Chain Syncer for each network.

### How to make sure that I have the latest state of the field?

Use global_index to make sure that you have the latest state of the field.

### Why sometimes I receive errors while syncing?

Because of unreliability of most of the RPCs, the syncer may miss some events from the latest blocks, so the syncer will rescan previous `options.safe_rescan_every_n_block * 2` blocks every `options.safe_rescan_every_n_block` block. Also use `options.rpc_url` as array of urls so if the first one fails - it will try to use the second one and so on.

## Contributing

Feel free to contribute to this project.

### Testing

First of all let's start docker container with local Ganache node:

```bash
$ sh test.sh
```

Then enter the container:

```bash
$ docker exec -it chainsyncer_tester sh
```

And finally run tests:

```bash
$ npm run test
```

OR just run in one line:

```bash
$ sh test.sh full
```

### Building

```bash
$ npm run build
```

Please make sure you built `dist` folder before commiting.

---

## License
Chain Syncer is released under the MIT license. © 2022 Miroslaw Shpak
