echo "[*] adding test for UBIN-153..."


echo "[*] Submiting queued payments for test case 1..."
truffle exec --network a createTrx.js 2 5100 0 0 R201700000000001
truffle exec --network a createTrx.js 3 5200 0 0 R201700000000002
truffle exec --network a createTrx.js 2 5300 0 0 R201700000000003
truffle exec --network a createTrx.js 3 7 1 0 R201700000000004
echo""
truffle exec --network a getQueue.js -a
echo "[*] Queue should NOT contain R201700000000004"
echo ""

truffle exec --network a createTrx.js 3 5 0 0 R201700000000005
truffle exec --network a getQueue.js -a
echo "[*] Queue should contain R201700000000005"


echo "[*] Submiting queued payments for test case 3..."
truffle exec --network a createTrx.js 2 5300 0 0 R201700000000009
truffle exec --network a createTrx.js 3 5500 0 0 R201700000000010
truffle exec --network a createTrx.js 2 5600 0 0 R201700000000011
truffle exec --network a createTrx.js 3 5700 1 0 R201700000000012
truffle exec --network a createTrx.js 3 2 1 0 R201700000000013
truffle exec --network a getQueue.js
echo "[*] Queue should contain R201700000000009 to R201700000000013 "
