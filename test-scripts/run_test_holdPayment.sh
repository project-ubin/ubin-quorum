#!/bin/bash
echo "[*] initializing states and initial funds..."
truffle exec --network mas wipeout.js
truffle exec --network mas createStashesDyn.js
truffle exec --network mas setBalance.js 1 100
truffle exec --network mas setBalance.js 2 200
truffle exec --network mas setBalance.js 3 300

echo "[*] Round 2: testing with more items in queue..."
echo ""
truffle exec --network a createTrx.js 2 101 0 0 R2000001
truffle exec --network a createTrx.js 3 200 0 0 R2000002
truffle exec --network a createTrx.js 2 300 0 0 R2000003
truffle exec --network a createTrx.js 3 400 0 0 R2000004
truffle exec --network a createTrx.js 2 500 0 0 R2000005
truffle exec --network a createTrx.js 3 600 0 0 R2000006
truffle exec --network a createTrx.js 2 700 0 0 R2000007
echo ""
echo "[*] Hold all"
truffle exec --network a holdPayment.js R2000001
truffle exec --network a holdPayment.js R2000002
truffle exec --network a holdPayment.js R2000003
truffle exec --network a holdPayment.js R2000004
truffle exec --network a holdPayment.js R2000005
truffle exec --network a holdPayment.js R2000006
truffle exec --network a holdPayment.js R2000007
echo ""
echo "[*] submitting another payment"
truffle exec --network a createTrx.js 2 3 0 0 R2000008

truffle exec --network a getQueue.js
echo "[*] gridlock queue should NOT contain R2000008"

echo ""
echo "[*] Unhold half"
truffle exec --network a unholdPayment.js R2000001
truffle exec --network a unholdPayment.js R2000002
truffle exec --network a unholdPayment.js R2000003
truffle exec --network a unholdPayment.js R2000004

echo ""
echo "[*] submitting another payment"
truffle exec --network a createTrx.js 2 3 0 0 R2000009

truffle exec --network a getQueue.js
echo "[*] gridlock queue should contain R2000009"
echo ""
echo "[*] Unhold half"
truffle exec --network a unholdPayment.js R2000005
truffle exec --network a unholdPayment.js R2000006
truffle exec --network a unholdPayment.js R2000007

echo ""
echo "[*] submitting another payment"
truffle exec --network a createTrx.js 3 2 0 0 R2000010
truffle exec --network a getQueue.js
echo "[*] gridlock queue should contain R2000010"
echo ""
echo "[*] cancel or hold all remaining pending payments"
truffle exec --network a cancelPayment.js R2000010
truffle exec --network a holdPayment.js R2000009
# truffle exec --network a holdPayment.js R2000008
truffle exec --network a cancelPayment.js R2000001
truffle exec --network a cancelPayment.js R2000002
truffle exec --network a cancelPayment.js R2000003
truffle exec --network a cancelPayment.js R2000004
truffle exec --network a holdPayment.js R2000005
truffle exec --network a holdPayment.js R2000006
truffle exec --network a holdPayment.js R2000007
echo ""
echo "[*] submitting another payment"
truffle exec --network a createTrx.js 3 5 0 0 R2000011
truffle exec --network a getQueue.js
echo "[*] gridlock queue should NOT contain R2000011"
