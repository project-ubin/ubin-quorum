#!/bin/bash

echo "[*] initializing states and initial funds for S3 Netting Test..."
# ./initStash.sh 6 3000 4000 5000 8000 3000


echo ""
echo "[*] setting up the payments"
echo ""

truffle exec --network e createTrx.js 1 8000 0 0 S300001
truffle exec --network e createTrx.js 4 9000 0 0 S300002
truffle exec --network d createTrx.js 5 15000 0 0 S300003
truffle exec --network a createTrx.js 2 14000 0 0 S300004
truffle exec --network b createTrx.js 3 15000 0 0 S300005
truffle exec --network c createTrx.js 1 10000 0 0 S300006

echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
truffle exec --network d getQueue.js
truffle exec --network e getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js
