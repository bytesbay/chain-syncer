export const scanContracts = async function(max_block, opts = {}) {

  let proms = [];
  
  const _contracts = this.used_contracts.filter(n => !this.ignore_contracts.includes(n))

  for (const i in _contracts) {
    const contract_name = _contracts[i];

    const prom = this.getContractEvents(contract_name, max_block, opts)
      .catch(err => {
        console.error('Error in gethering events for contract', `${contract_name}:`, err.message);
        return null;
      });

    proms.push(prom);
  }

  let scans = [];
  let events = [];

  if(proms.length) {
    scans = await Promise.all(proms).then(data => data.filter(n => n));
    events = await this.addEvents(scans);
  }

  return { scans, events };

}