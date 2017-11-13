echo "[*] Deploy contracts and initializing states"
truffle exec --network mas dapps/init.js
echo "[*] Stashes now have balances as private states"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
sleep 1
echo "[*] Submit a payment when there's enough liquidity"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network a dapps/submit_1.js
echo "[*] Positions are updated"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Payment are placed in the participating parties in pending state"
truffle exec --network a dapps/pmt.js
truffle exec --network b dapps/pmt.js
truffle exec --network c dapps/pmt.js
echo "[*] Checking gridlock queue - should be empty"
truffle exec --network a dapps/gridlockQ.js
truffle exec --network b dapps/gridlockQ.js
truffle exec --network c dapps/gridlockQ.js
echo "[*] Confirm queued payment"
truffle exec --network a dapps/confirm.js
echo "[*] Balances are updated"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Payment state is updated"
truffle exec --network a dapps/pmt.js
truffle exec --network b dapps/pmt.js
truffle exec --network c dapps/pmt.js
echo "[*] Submit a set of gridlocking payments"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network a dapps/submit_gridlocked.js
# truffle exec --network a dapps/add2GQ.js
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network b dapps/submit_gridlocked.js
# truffle exec --network b dapps/add2GQ.js
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network c dapps/submit_gridlocked.js
# truffle exec --network c dapps/add2GQ.js
echo "[*] Positions are updated"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Payments are queued into private gridlock queue"
truffle exec --network a dapps/gridlockQ.js
truffle exec --network b dapps/gridlockQ.js
truffle exec --network c dapps/gridlockQ.js
echo "[*] Payments are committed into global gridlock queue"
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
echo "[*] Line should be open now - Agent state should be Lineopen"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
echo "[*] Participants are lining up"
truffle exec --network a dapps/lineup.js
truffle exec --network b dapps/lineup.js
truffle exec --network c dapps/lineup.js
wait
echo "[*] Resolve sequence is decided"
truffle exec --network a dapps/resolveSeq.js
truffle exec --network b dapps/resolveSeq.js
truffle exec --network c dapps/resolveSeq.js
echo "[*] Participants do gridlock resolution in round robin"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network a dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
# truffle exec --network a dapps/checkDone.js
truffle exec --network b dapps/globalQ.js
# truffle exec --network b dapps/checkDone.js
truffle exec --network c dapps/globalQ.js
# truffle exec --network c dapps/checkDone.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network b dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
# truffle exec --network a dapps/checkDone.js
truffle exec --network b dapps/globalQ.js
# truffle exec --network b dapps/checkDone.js
truffle exec --network c dapps/globalQ.js
# truffle exec --network c dapps/checkDone.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network c dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
# truffle exec --network a dapps/checkDone.js
truffle exec --network b dapps/globalQ.js
# truffle exec --network b dapps/checkDone.js
truffle exec --network c dapps/globalQ.js
# truffle exec --network c dapps/checkDone.js
echo "[*] Balance before netting"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Agent state moved to Settling"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
echo "[*] Next participant kick off the settling process"
truffle exec --network a dapps/settle.js
echo "[*] Netting result"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
truffle exec --network a dapps/pmt.js
truffle exec --network b dapps/pmt.js
truffle exec --network c dapps/pmt.js
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
echo "[*] Regulator reset gridlock trigger (for the next test)"
truffle exec --network mas dapps/setThreshold.js
echo "[*] Submit a set of deadlocking payments"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network a dapps/submit_deadlocked.js
truffle exec --network a dapps/add2GQ_deadlocked.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network b dapps/submit_deadlocked.js
truffle exec --network b dapps/add2GQ_deadlocked.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network c dapps/submit_deadlocked.js
truffle exec --network c dapps/add2GQ_deadlocked.js
echo "[*] Positions are updated"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Payments are queued into private gridlock queue"
truffle exec --network a dapps/pmt.js
truffle exec --network b dapps/pmt.js
truffle exec --network c dapps/pmt.js
echo "[*] Payments are queued into global gridlock queue"
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
echo "[*] Line should be open now - Agent state should be Lineopen"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
echo "[*] Participants are lining up"
truffle exec --network a dapps/lineup.js
truffle exec --network b dapps/lineup.js
truffle exec --network c dapps/lineup.js
echo "[*] Resolve sequence is decided"
truffle exec --network a dapps/resolveSeq.js
truffle exec --network b dapps/resolveSeq.js
truffle exec --network c dapps/resolveSeq.js
echo "[*] Participants do gridlock resolution in round robin"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network a dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network b dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
truffle exec --network c dapps/checkAgentState.js
truffle exec --network c dapps/doResolve.js
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
echo "[*] Agent state moved to Settling"
truffle exec --network a dapps/checkAgentState.js
truffle exec --network b dapps/checkAgentState.js
truffle exec --network c dapps/checkAgentState.js
echo "[*] Balance before netting"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
echo "[*] Next participant kick off the settling process"
truffle exec --network a dapps/settle.js
echo "[*] Netting result"
truffle exec --network a dapps/bal.js
truffle exec --network b dapps/bal.js
truffle exec --network c dapps/bal.js
truffle exec --network a dapps/pmt.js
truffle exec --network b dapps/pmt.js
truffle exec --network c dapps/pmt.js
truffle exec --network a dapps/globalQ.js
truffle exec --network b dapps/globalQ.js
truffle exec --network c dapps/globalQ.js
