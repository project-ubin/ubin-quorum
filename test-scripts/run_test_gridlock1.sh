#!/bin/bash
echo "[*] initializing states and initial funds..."
# newer versions .... replace when deployed
# truffle exec --network mas wipeout.js
# truffle exec --network mas createStashesDyn.js
truffle exec --network mas createStashes.js
truffle exec --network mas setBalance.js 1 50
truffle exec --network mas setBalance.js 2 60
truffle exec --network mas setBalance.js 3 70
# truffle exec --network mas setBalance.js 4 $4
# truffle exec --network mas setBalance.js 5 $5
truffle exec --network mas setThreshold.js 4
echo "[*] starting balances:"
truffle exec --network mas getStashes.js


echo ""
echo""
echo "[*] setting up the payments"
echo ""
truffle exec --network a createTrx.js 2 80 0 0 R000001
truffle exec --network b createTrx.js 3 70 0 0 R000002
truffle exec --network c createTrx.js 1 90 0 0 R000003
truffle exec --network a createTrx.js 2 200 0 0 R000004
echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js
