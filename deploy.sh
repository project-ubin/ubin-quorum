rm -rf build
truffle deploy --network mas
cd solc-local

echo "[*] deploying SGDz to node 01..."
sudo ./deploy_multi.sh
cd ..

nohup npm run dev 2 >> ~/lite-server.log &
