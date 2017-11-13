echo "[*] starting test for UBIN-153..."
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js
echo "[*] Initialising stashes and balances..."
./initStash.sh 50 1 1

# var gridlockThreshold = 50; 
# var bal_a = 50;
# var bal_b = 0;
# var bal_c = 0;

echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 55 0 0 R201700000000001
truffle exec --network a createTrx.js 3 53 0 0 R201700000000002
truffle exec --network a createTrx.js 2 63 0 0 R201700000000003
truffle exec --network a createTrx.js 3 20 0 0 R201700000000004
truffle exec --network a getQueue.js -a

echo "[*] Clearing existing queues..."
truffle exec --network a clearQueues.js
echo "[*] initializing states and initial funds..."
./initStash.sh 50 1 1

echo "[*] Submiting queued payments for test case 2..."
truffle exec --network a createTrx.js 2 55 0 0 R201700000000005
truffle exec --network a createTrx.js 3 53 0 0 R201700000000006
truffle exec --network a createTrx.js 2 63 0 0 R201700000000007
truffle exec --network a createTrx2.js 3 20 1 0 R201700000000008
truffle exec --network a getQueue.js -a

echo "[*] Clearing existing queues..."
truffle exec --network a clearQueues.js
echo "[*] initializing states and initial funds..."
./initStash.sh 50 1 1

echo "[*] Submiting queued payments for test case 3..."
truffle exec --network a createTrx.js 2 55 0 0 R201700000000009
truffle exec --network a createTrx.js 3 53 0 0 R201700000000010
truffle exec --network a createTrx.js 2 63 0 0 R201700000000011
truffle exec --network a createTrx.js 3 73 1 0 R201700000000012
truffle exec --network a createTrx.js 3 20 1 0 R201700000000013
truffle exec --network a getQueue.js -a
