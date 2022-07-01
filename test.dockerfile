FROM trufflesuite/ganache-cli

WORKDIR /usr/src/app

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

COPY package*.json ./

RUN npm i

ARG MNEMONIC='happy bachelor kid razor tenant october zebra term follow hurry goat crystal'
ARG NETWORK_ID=5777

ENV RPC_URL=http://localhost:8545
ENV WAIT_HOSTS=localhost:8545
ENV INTERGRATION_TESTS=true
ENV MNEMONIC=${MNEMONIC}
ENV NETWORK_ID=${NETWORK_ID}

COPY . .

ENTRYPOINT node \ 
  /app/ganache-core.docker.cli.js \ 
  --deterministic \ 
  --db=/ganache_data \ 
  --mnemonic "$MNEMONIC" \ 
  --networkId $NETWORK_ID \
  --chainId $NETWORK_ID \
  --hostname '0.0.0.0' \
  --quiet \
  --allowUnlimitedContractSize \
  -l 100000000