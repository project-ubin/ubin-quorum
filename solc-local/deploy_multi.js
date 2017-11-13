const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');

// To do : Update host and port to read from deployment script
const host = "quorumnx01.southeastasia.cloudapp.azure.com";
const port = "20010";
const web3 = new Web3(new Web3.providers.HttpProvider("http://" + host + ":" + port));


var sgdz_compiled = JSON.parse(fs.readFileSync('sgdz_compiled_bak', 'utf8'));

var sgdzContract = web3.eth.contract(sgdz_compiled["abi"]);

var sgdz = sgdzContract.new({
    from: web3.eth.accounts[0],
    data: "0x" + sgdz_compiled["bytecode"],
    gas: '114700000'
}, (e, contract) => {
    if (e) {
        console.log("err creating contract", e);
    } else {
        if (!contract.address) {
            console.log("Contract transaction send: TransactionHash: " + contract.transactionHash
                + " waiting to be mined...");
        } else {
            console.log("Contract mined! Address: " + contract.address);

            fs.writeFile('zAddress', contract.address,
                err => { if (err) console.log(err); });
        }
    }
});
