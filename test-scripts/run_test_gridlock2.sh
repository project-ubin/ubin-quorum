#!/bin/bash
echo "[*] initializing states and initial funds..."

echo "[*] starting balances:"
truffle exec --network mas getStashes.js

echo ""
echo""
echo "[*] setting up the payments"
echo ""
truffle exec --network a createTrx.js 2 70 0 0 R000001
truffle exec --network b createTrx.js 3 30 0 0 R000002
truffle exec --network c createTrx.js 1 60 0 0 R000003
truffle exec --network a createTrx.js 2 200 0 0 R000004
echo ""
echo "[*] the queues:"
truffle exec --network a getQueue.js
truffle exec --network b getQueue.js
truffle exec --network c getQueue.js
echo "[*] stashes:"
truffle exec --network mas getStashes.js
