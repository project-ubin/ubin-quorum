echo "[*] starting test for UBIN-84..."
echo "[84] Privacy of counterparties during fund transfer"
echo "[*] Clearing existing queues..."
truffle exec --network a clearQueues.js 

echo "[*] Initialising stashes and balances..."
./initStash.sh 1000 10 1 999

echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 100 0 0 R2017000000001

echo "[*] Query payment during PENDING status:"
truffle exec --network a getPmtDtls.js R2017000000001
truffle exec --network b getPmtDtls.js R2017000000001
truffle exec --network c getPmtDtls.js R2017000000001

echo "[*] Confirm the payment:"
truffle exec --network b confirmPayment.js R2017000000001

echo "[*] Query payment during CONFIRMED status:"
truffle exec --network a getPmtDtls.js R2017000000001
truffle exec --network b getPmtDtls.js R2017000000001
truffle exec --network c getPmtDtls.js R2017000000001