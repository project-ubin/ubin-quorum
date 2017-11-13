# echo "[*] initializing states and initial funds for S3 Netting Test..."
# ./initStash.sh 8 640 560 650 660 550 1000

truffle exec --network a createTrx.js 3 745 0 0 S300001
truffle exec --network b createTrx.js 4 989 0 0 S300002
truffle exec --network b createTrx.js 1 658 0 0 S300003
truffle exec --network b createTrx.js 3 903 0 0 S300004
truffle exec --network c createTrx.js 2 701 0 0 S300005
truffle exec --network c createTrx.js 1 827 0 0 S300006
truffle exec --network e createTrx.js 2 566 0 0 S300007
truffle exec --network e createTrx.js 1 931 0 0 S300008
