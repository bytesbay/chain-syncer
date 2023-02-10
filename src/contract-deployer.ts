import { ethers as Ethers } from 'ethers';
import FS from 'fs';
import { ethers_provider, ethers_signer } from './ethers-init';

export const deploy = async (): Promise<{ Items: Ethers.Contract, Materials: Ethers.Contract, items_abi: any[], materials_abi: any[] }> => {

  const items_artifact = JSON.parse(FS.readFileSync('src/abis/Items.json').toString())
  const materials_artifact = JSON.parse(FS.readFileSync('src/abis/Materials.json').toString())

  const Items = await (async () => {
    const factory = new Ethers.ContractFactory(items_artifact.abi, items_artifact.data.bytecode.object, ethers_signer)
    const contract = await factory.deploy().then(c => c.waitForDeployment())
    
    return new Ethers.Contract(await contract.getAddress(), items_artifact.abi, ethers_provider);
  })();

  const Materials = await (async () => {
    const factory = new Ethers.ContractFactory(materials_artifact.abi, materials_artifact.data.bytecode.object, ethers_signer)
    const contract = await factory.deploy().then(c => c.waitForDeployment())

    return new Ethers.Contract(await contract.getAddress(), materials_artifact.abi, ethers_provider);
  })();

  return { 
    Items, 
    Materials, 
    items_abi: items_artifact.abi as any[], 
    materials_abi: materials_artifact.abi as any[]
  }
};