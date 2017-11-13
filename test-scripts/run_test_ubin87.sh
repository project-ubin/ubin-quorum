echo "[*] starting test for UBIN-87..."
echo "[87] Privacy of total account balance"
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 

echo "[*] Initialising stashes and balances..."
./initStash.sh 1000 10 1 999
echo ""
echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 100 0 0 R8700000001
echo ""
echo "[*] Query stashes during PENDING status:"
truffle exec --network a getStashes.js 
truffle exec --network b getStashes.js 
truffle exec --network c getStashes.js
echo "[*] Actual balances from MAS' POV:"
truffle exec --network mas getStashes.js
echo ""
echo "[*] Confirm the payment:"
truffle exec --network b confirmPayment.js R8700000001
echo ""
echo "[*] Query stashes during PENDING status:"
truffle exec --network a getStashes.js 
truffle exec --network b getStashes.js 
truffle exec --network c getStashes.js
echo "[*] Actual balances from MAS' POV:"
truffle exec --network mas getStashes.js
