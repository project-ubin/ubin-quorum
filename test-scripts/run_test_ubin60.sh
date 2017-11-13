echo "[*] starting test for UBIN-60 [update priority]..."
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 
echo "[*] Initialising stashes and balances..."
./initStash.sh 100 1 1

echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 300 0 0 R2017000000000015
truffle exec --network a createTrx.js 2 400 0 0 R2017000000000025
truffle exec --network a createTrx.js 2 200 0 0 R2017000000000035
echo "[*] Updating priority for test case 1..."
truffle exec --network a setPriority.js R2017000000000015 1

echo "[*] Clearing existing queues..."
truffle exec --network a clearQueues.js 
echo "[*] Initialising stashes and balances..."
./initStash.sh 5000 1 1
echo "[*] Submiting queued payments for test case 2..."
truffle exec --network a createTrx.js 2 300 0 0 R2017000000000045
truffle exec --network a createTrx.js 2 400 0 0 R2017000000000055
truffle exec --network a createTrx.js 2 200 0 0 R2017000000000065
echo "[*] Updating priority for test case 2..."
truffle exec --network a setPriority.js R2017000000000065 1

echo "[*] Clearing existing queues..."
truffle exec --network a clearQueues.js 
echo "[*] Initialising stashes and balances..."
./initStash.sh 100 1 1
echo "[*] Submiting queued payments for test case 3..."
truffle exec --network a createTrx.js 2 300 1 0 R2017000000000075
truffle exec --network a createTrx.js 2 400 0 0 R2017000000000085
truffle exec --network a createTrx.js 2 200 0 0 R2017000000000095
echo "[*] Updating priority for test case 3..."
truffle exec --network a setPriority.js BankA BankB R2017000000000075 0
echo "[*] Submiting new payments for test case 3..."
truffle exec --network a createTrx.js 2 150 1 0 R2017000000000105
truffle exec --network a getQueue.js -a
echo " "
echo "[*] Transactions with updated priority levels from BankA's point of view:"
truffle exec --network a getPmtDtls.js R2017000000000015
truffle exec --network a getPmtDtls.js R2017000000000065
truffle exec --network a getPmtDtls.js R2017000000000105

echo "[*] Transactions with updated priority levels from BankB's point of view:"
truffle exec --network b getPmtDtls.js R2017000000000015
truffle exec --network b getPmtDtls.js R2017000000000065
truffle exec --network b getPmtDtls.js R2017000000000105
