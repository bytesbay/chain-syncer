let latest_id = 1;

export const mockEvent = (event) => {

  const hash = '0x3634a317c899e3c45a13f21d1e3b8fd03f2c908994f031460767b16d97f49742';

  const id = hash + '_' + latest_id++;

  return {
    id,
    event,
    contract: 'Test',
    transaction_hash: hash,
    block_number: 10000,
    log_index: 12,
    tx_index: 1,
    from_address: '0x9d4133c308D497C6ee62f0ce3f43B167316F15ed',
    global_index: 10000000012,
    block_timestamp: new Date(),
    args: [ '0x0', '233442', 15 ],
  }
}