echo "[*] starting test for UBIN-61 [cancel payment]..."
echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 
echo "[*] Initialising stashes and balances..."
./initStash.sh 100 1 1 999




echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 300 0 0 R2017000000001
truffle exec --network a createTrx.js 2 400 0 0 R2017000000002
truffle exec --network a createTrx.js 2 200 0 0 R2017000000003

echo "[*] Payment statuses:"
truffle exec --network a getQueue.js -a

echo "[*] Cancelling payment for test case 1..."
truffle exec --network a cancelPayment.js R2017000000001

echo "[*] Payment status after cancel:"
truffle exec --network a getPmtDtls.js R2017000000001
truffle exec --network b getPmtDtls.js R2017000000001
echo "[*] Queue after cancel:"
truffle exec --network a getQueue.js

echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 

echo "[*] Submiting queued payments for test case 2..."
truffle exec --network a createTrx.js 2 500 0 0 R2017000000004

echo "[*] Hold the payment..."
truffle exec --network a holdPayment.js R2017000000004
echo "[*] Payment status after hold:"
truffle exec --network a getPmtDtls.js R2017000000004

echo "[*] Attempting to cancel ..."
truffle exec --network a cancelPayment.js R2017000000004

echo "[*] Payment status after cancel:"
truffle exec --network a getPmtDtls.js R2017000000004


echo "[*] Submiting queued payments for test case 3..."
truffle exec --network a createTrx.js 2 500 0 0 R2017000000005

echo "[*] Attempting to cancel ..."
truffle exec --network a cancelPayment.js R2017000000005

echo "[*] Payment status after cancel:"
truffle exec --network a getPmtDtls.js R2017000000005

echo "[*] Hold the payment..."
truffle exec --network a holdPayment.js R2017000000005
echo "[*] Payment status after hold:"
truffle exec --network a getPmtDtls.js R2017000000005

echo "[*] Clearing existing queues..."
truffle exec --network mas clearQueues.js 


echo "[*] Submiting queued payments for test case 4..."
truffle exec --network a createTrx.js 2 5 0 0 R2017000000006
truffle exec --network b confirmPayment.js R2017000000006

echo "[*] Payment status after confirm:"
truffle exec --network a getPmtDtls.js R2017000000006

echo "[*] Attempting to cancel ..."
truffle exec --network a cancelPayment.js 2 R2017000000006

echo "[*] Payment status after attempt:"
truffle exec --network a getPmtDtls.js R2017000000006


echo "********Results************"
echo "[*] Test case 1 expected results: Payment State and Global Gridlocked State = Cancelled"
truffle exec --network a getPmtDtls.js R2017000000001
echo ""
echo ""
echo "[*] Test case 2 expected results: Payment State and Global Gridlocked State = Cancelled"
truffle exec --network a getPmtDtls.js R2017000000004
echo ""
echo ""
echo "[*] Test case 3 expected results: Payment State and Global Gridlocked State = Cancelled"
truffle exec --network a getPmtDtls.js R2017000000005
echo ""
echo ""
echo "[*] Test case 4 expected results: Payment State = Confirmed | Global Gridlocked State = Inactive"
truffle exec --network a getPmtDtls.js R2017000000006
echo ""
echo ""