#!/bin/bash
echo "[*] initializing states and initial funds..."
truffle exec --network mas wipeout.js
truffle exec --network mas createStashesDyn.js
truffle exec --network mas setBalance.js 1 100
truffle exec --network mas setBalance.js 2 200
truffle exec --network mas setBalance.js 3 300
echo "[*] submitting payment for regression testing"
truffle exec --network a createTrx.js 2 20 0 0 R0000001

truffle exec --network a getQueue.js
echo "[*] gridlock queue should be zero"
echo ""
echo""
echo "[*] setting up a queue"
truffle exec --network a createTrx.js 2 200 0 0 R0000002

echo ""
echo "[*] cancelling the payment"
truffle exec --network a cancelPayment.js R0000002
echo ""
echo "[*] checking payment status"
truffle exec --network a getPmtDtls.js R0000002

echo "[*] submitting another payment"
truffle exec --network a createTrx.js 2 30 0 0 R0000003

truffle exec --network a getQueue.js -a
echo "[*] gridlock queue should not contain R0000003"