#!/bin/bash

# echo "[*] initializing states and initial funds for Test F6.3..."
# ./initStash.sh 10 3000 4000 5000 4000 3000

# truffle exec --network mas wipeout.js
# truffle exec --network mas createStashesDyn2.js
# truffle exec --network mas setShieldedBalance2.js 1 3000
# truffle exec --network mas setShieldedBalance2.js 2 4000
# truffle exec --network mas setShieldedBalance2.js 3 5000
# truffle exec --network mas setShieldedBalance2.js 4 4000
# truffle exec --network mas setShieldedBalance2.js 5 3000
# echo "[*] setting queue threshold for scenario"

# truffle exec --network mas setThreshold.js 10
echo "[*] starting balances:"
truffle exec --network mas getStashes.js
echo ""
echo""
echo "[*] setting up the payments"
echo ""
truffle exec --network a createTrx.js 2 5000 0 0 F6300001
truffle exec --network b createTrx.js 3 6000 0 0 F6300002
truffle exec --network b createTrx.js 3 30000 0 0 F6300003
truffle exec --network c createTrx.js 4 8000 0 0 F6300004
truffle exec --network c createTrx.js 5 80000 0 0 F6300005
truffle exec --network d createTrx.js 5 7000 0 0 F6300006
truffle exec --network a createTrx.js 3 6000 0 0 F6300007
truffle exec --network e createTrx.js 1 8000 0 0 F6300008
truffle exec --network e createTrx.js 2 100000 0 0 F6300009
truffle exec --network d createTrx.js 1 5000 0 0 F6300010
echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
truffle exec --network d getQueue.js
truffle exec --network e getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js
