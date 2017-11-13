#!/bin/bash

echo "[*] initializing states and initial funds for Netting Test..."
./initStash.sh 5 1000 2000 3000 4000 5000 6000


echo ""
echo "[*] setting up the payments"
echo ""

truffle exec --network a createTrx.js 2 1200 0 0 S300001
truffle exec --network b createTrx.js 6 2200 0 0 S300002
truffle exec --network c createTrx.js 4 3200 0 0 S300003
truffle exec --network d createTrx.js 5 4200 0 0 S300004
truffle exec --network e createTrx.js 2 5200 0 0 S300005

echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
truffle exec --network d getQueue.js
truffle exec --network e getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js
