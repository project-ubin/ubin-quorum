#!/bin/bash
echo "[*] initializing states and initial funds..."
echo "[*] starting balances:"
truffle exec --network mas getStashes.js


echo ""
echo""
echo "[*] setting up the payments"
echo ""
truffle exec --network a createTrx.js 2 8 0 0 R0000011
truffle exec --network b createTrx.js 3 7 0 0 R0000021
truffle exec --network c createTrx.js 1 9 0 0 R0000031
truffle exec --network a createTrx.js 2 20 0 0 R0000041
echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js

