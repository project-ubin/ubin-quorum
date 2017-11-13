const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var u = require('./test-utils.js');
// set initial variables
var bankIdx = process.argv[6];
var bal = process.argv[7];
bal = bal < 1 ? 1 : bal; //balance can't be zero

bankName = nodes[bankIdx].stashName;
let i = u.searchNode(nodes, 'stashName', bankName);
var consKey = nodes[i].constKey;

module.exports = (done) => {
  let paymentAgent = null;
  
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    console.log("Setting "+bankName+"'s stash balance to " + bal + "...");
    return paymentAgent.pledge(bankName, bal, {privateFor: [consKey]});
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
    console.log("");
     done();
  }).catch((e) => {
    console.log(e);
    done();
  });
};
