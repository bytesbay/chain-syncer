#!/bin/bash

sudo docker stop chainsyncer_tester
sudo rm -rf .data
sudo docker build --tag chainsyncer_tester --file test.dockerfile .
sudo docker run --name chainsyncer_tester -d --rm chainsyncer_tester

if [[ "$1" == "full" ]]; then
  docker exec -t chainsyncer_tester /wait
  docker exec -t chainsyncer_tester npm run test
fi

exit 0