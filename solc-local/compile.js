const fs = require('fs');
const solc = require('solc');

const input = fs.readFileSync('all.sol');

const output = solc.compile(input.toString(), 1);

const bytecode = output.contracts['SGDz'].bytecode;
const abi = JSON.parse(output.contracts['SGDz'].interface);

// var outfile = "var sgdzContract = web3.eth.contract("+JSON.stringify(abi)+");var sgdz = sgdzContract.new({  from: web3.eth.accounts[0],  data: '"+bytecode+"',  gas: '4700000'}, function (e, contract){  if (e) {    console.log(\"err creating contract\", e);  } else {    if (!contract.address) {      console.log(\"Contract transaction send: TransactionHash: \" + contract.transactionHash + \" waiting to be mined...\");    } else {     console.log(\"Contract mined! Address: \" + contract.address);      console.log(contmact);    }  }});";

var outfile = {
  "bytecode" : bytecode,
  "abi" : abi
}

fs.writeFile('sgdz_compiled', JSON.stringify(outfile),
             err => { if(err) console.log(err); });

// fs.writeFile('deploy_sgdz', JSON.stringify(outfile),
//              err => { if(err) console.log(err); });
