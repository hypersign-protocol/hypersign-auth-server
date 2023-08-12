#!/bin/bash
if [ -e hypersign.json ]
then
    echo "hypersign.json  exists.. skipping"
else
    echo "hypersign json does not exists already. skipping.."
    npm run bootstrap:dev 
fi

npm run dev
nohup npm run service:dev > service.log &
# exit
