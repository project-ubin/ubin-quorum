echo "[*] starting test for UBIN-62 [hold and unhold payments]..."
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 

echo "[*] Initialising stashes and balances..."
./initStash.sh 100 1 1 999

echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 300 0 0 R201700000000111
truffle exec --network a createTrx.js 2 400 0 0 R201700000000121
truffle exec --network a createTrx.js 2 200 0 0 R201700000000131
echo "[*] Holding payment for test case 1..."
truffle exec --network a holdPayment.js R201700000000121
echo "[*] Increasing balance in Bank A..."
truffle exec --network mas setBalance.js 2 900
echo "[*] Payment statuses:"
truffle exec --network a getPmtDtls.js R201700000000111
truffle exec --network a getPmtDtls.js R201700000000121
truffle exec --network a getPmtDtls.js R201700000000131
truffle exec --network b getPmtDtls.js R201700000000121

echo "[*] unholding payment for test case 1..."
truffle exec --network a unholdPayment.js R201700000000121
echo "[*] Payment statuses:"
truffle exec --network a getPmtDtls.js R201700000000121
truffle exec --network b getPmtDtls.js R201700000000121
