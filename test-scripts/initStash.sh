#!/bin/bash

echo "[*] linking z-contract..."
truffle exec --network mas setZAddress.js

echo "[*] initializing states and initial funds..."
truffle exec --network mas createStashesDyn2.js

truffle exec --network mas setThreshold.js $1

NARGS=$#
while test $# -gt 1
do
    index=`expr $NARGS - $# + 1`
    # truffle exec --network cb setupBalance.js $index $2
    truffle exec --network cb pledge.js $index $2
    truffle exec --network mas setShieldedBalance.js $index $2
    shift
done
