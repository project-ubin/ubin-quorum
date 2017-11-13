echo "[*] starting test for UBIN-86..."
echo "[86] Privacy of transaction in queue"
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 

echo "[*] Initialising stashes and balances..."
./initStash.sh 1 1 1 999

echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 60 0 0 R86000001111
truffle exec --network b createTrx.js 3 50 0 0 R86000001112
truffle exec --network c createTrx.js 1 10 0 0 R86000001113
truffle exec --network c createTrx.js 2 70 0 0 R86000001114
truffle exec --network a createTrx.js 3 80 0 0 R86000001115
truffle exec --network b createTrx.js 3 90 0 0 R86000001116

echo "[*] Query queues :"
truffle exec --network a getQueue.js
truffle exec --network a globalQ.js
echo ""
truffle exec --network b getQueue.js
truffle exec --network b globalQ.js
echo ""
truffle exec --network c getQueue.js
truffle exec --network c globalQ.js
echo ""
