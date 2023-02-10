import { IChainSyncerEventMetadata, TChainSyncerEventArg } from './types';
import abi from '@/abis/BUSD.json';
import * as Ethers from 'ethers';
import { IChainSyncerContractsResolverResult } from './types';
import ChainSyncer, { InMemoryAdapter } from './lib';

const test = async () => {

  const contracts: Record<string, IChainSyncerContractsResolverResult> = {
    'BUSD': {
      contract_abi: abi,
      start_block: 25548364,
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    },
    'DAI': {
      contract_abi: abi,
      start_block: 20548364,
      address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    },
    'USDC': {
      contract_abi: abi,
      start_block: 25548364,
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    'USDT': {
      contract_abi: abi,
      start_block: 20548364,
      address: '0x55d398326f99059fF775485246999027B3197955',
    },
    'M': {
      contract_abi: [
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "uri_",
              "type": "string"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "ApprovalForAll",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "bytes32",
              "name": "mint_request_id",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "nft_id",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "bytes32",
              "name": "project_id",
              "type": "bytes32"
            }
          ],
          "name": "NftMinted",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256[]",
              "name": "ids",
              "type": "uint256[]"
            },
            {
              "indexed": false,
              "internalType": "uint256[]",
              "name": "values",
              "type": "uint256[]"
            }
          ],
          "name": "TransferBatch",
          "type": "event"
        },
        // {
        //   "anonymous": false,
        //   "inputs": [
        //     {
        //       "indexed": true,
        //       "internalType": "address",
        //       "name": "operator",
        //       "type": "address"
        //     },
        //     {
        //       "indexed": true,
        //       "internalType": "address",
        //       "name": "from",
        //       "type": "address"
        //     },
        //     {
        //       "indexed": true,
        //       "internalType": "address",
        //       "name": "to",
        //       "type": "address"
        //     },
        //     {
        //       "indexed": false,
        //       "internalType": "uint256",
        //       "name": "id",
        //       "type": "uint256"
        //     },
        //     {
        //       "indexed": false,
        //       "internalType": "uint256",
        //       "name": "value",
        //       "type": "uint256"
        //     }
        //   ],
        //   "name": "TransferSingle",
        //   "type": "event"
        // },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "value",
              "type": "string"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            }
          ],
          "name": "URI",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            }
          ],
          "name": "balanceOf",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address[]",
              "name": "accounts",
              "type": "address[]"
            },
            {
              "internalType": "uint256[]",
              "name": "ids",
              "type": "uint256[]"
            }
          ],
          "name": "balanceOfBatch",
          "outputs": [
            {
              "internalType": "uint256[]",
              "name": "",
              "type": "uint256[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "burn",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "uint256[]",
              "name": "ids",
              "type": "uint256[]"
            },
            {
              "internalType": "uint256[]",
              "name": "values",
              "type": "uint256[]"
            }
          ],
          "name": "burnBatch",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "can_mint",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            }
          ],
          "name": "isApprovedForAll",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "mint_request_id_",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "owner_",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "project_id_",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "amount_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "data_",
              "type": "bytes"
            }
          ],
          "name": "mint",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "nft_index",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "renounceOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256[]",
              "name": "ids",
              "type": "uint256[]"
            },
            {
              "internalType": "uint256[]",
              "name": "amounts",
              "type": "uint256[]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "name": "safeBatchTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "name": "safeTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "setApprovalForAll",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "address_",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "can_mint_",
              "type": "bool"
            }
          ],
          "name": "setMintPermission",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "uri_",
              "type": "string"
            }
          ],
          "name": "setUri",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes4",
              "name": "interfaceId",
              "type": "bytes4"
            }
          ],
          "name": "supportsInterface",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "uri",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      start_block: 0,
      address: '0x04C57c626D214C9c6c90bdA24465380abFa24De4',
    },
  }

  const adapter = new InMemoryAdapter();

  const syncer = new ChainSyncer(adapter, {

    verbose: true,
    rpc_url: ['http://localhost:8546'],
    block_time: 10000,

    query_block_limit: 10,
    safe_rescans_to_repeat: 1,
    safe_rescan_every_n_block: 10,

    async contractsResolver(contract_name: string) {
      return contracts[contract_name];
    },
  });

  // let volume = 0;

  // syncer.on('BUSD.Transfer', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   from: any,
  //   to: any,
  //   amount: any,
  // ) => {

  //   amount = Ethers.formatEther(amount) // format from wei
  //   volume += Number(amount);

  //   console.log('Transfer', amount);
  // });

  // syncer.on('USDT.Transfer', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   from: any,
  //   to: any,
  //   amount: any,
  // ) => {

  //   amount = Ethers.formatEther(amount) // format from wei
  //   volume += Number(amount);

  //   console.log('Transfer', amount);
  // });

  // syncer.on('M.NftMinted', (
  //   event_metadata: IChainSyncerEventMetadata,
  // ) => {
  //   console.log('MINTED', event_metadata.block_number);
  // });

  syncer.on('M.TransferSingle', (
    event_metadata: IChainSyncerEventMetadata,
  ) => {
    console.log('TRANSFER', event_metadata.block_number);
  });

  // syncer.on('BUSD.Approval', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   address: any,
  //   amount: any,
  // ) => {
  //   // ...
  // });

  // syncer.on('DAI.Approval', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   address: any,
  //   amount: any,
  // ) => {
  //   // ...
  // });

  // syncer.on('USDC.Approval', (
  //   event_metadata: IChainSyncerEventMetadata,
  //   address: any,
  //   amount: any,
  // ) => {
  //   // ...
  // });

  await syncer.start();

  // @ts-ignore
  window.syncer = syncer;

  // @ts-ignore
  window.adapter = adapter;
}

// @ts-ignore
document.querySelector('#btn').addEventListener('click', () => test())

// @ts-ignore
document.querySelector('#stop').addEventListener('click', () => window.syncer.stop())