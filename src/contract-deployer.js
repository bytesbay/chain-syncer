import { ethers as Ethers } from 'ethers';
import FS from 'fs';
import { ethers_provider, ethers_signer } from './ethers-init';

export const deploy = async () => {

  // Set gas limit and gas price, using the default Ropsten provider
  // const price = ethers.utils.formatUnits(await provider.getGasPrice(), 'gwei')
  // const options = {gasLimit: 100000, gasPrice: ethers.utils.parseUnits(price, 'gwei')}

  const Items = await (async () => {
    const metadata = JSON.parse(FS.readFileSync('src/abis/Items.json').toString())
    const factory = new Ethers.ContractFactory(metadata.abi, metadata.data.bytecode.object, ethers_signer)
    const contract = await factory.deploy()
    return (await contract.deployed()).connect(ethers_signer);
  })();

  const Materials = await (async () => {
    const metadata = JSON.parse(FS.readFileSync('src/abis/Materials.json').toString())
    const factory = new Ethers.ContractFactory(metadata.abi, metadata.data.bytecode.object, ethers_signer)
    const contract = await factory.deploy()
    return (await contract.deployed()).connect(ethers_signer);
  })();

  return { Items, Materials }
};