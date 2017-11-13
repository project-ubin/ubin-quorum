const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

// set initial variables
var txRef = process.argv[6];

module.exports = (done) => {
  let paymentAgent = null;
  
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    console.log("searching for transaction " + txRef + "...");
    return paymentAgent.payments.call(txRef);
  }).then((pmt) => {
      if(pmt[3] == 0){
        throw ('Trx '+txRef+' does not exist'); //assume no trx with 0 amount is sent
      }else{
        let sender = util.hex2a(pmt[1]);
        let nodesPrivateFor = u.removeOthers(nodes, sender);
        var keysPrivateFor = u.getValueFromAllNodes(nodesPrivateFor, 'constKey');
      }
      console.log("confirming payment "+txRef+"...");
      return paymentAgent.confirmPmt(txRef, {privateFor: keysPrivateFor});    
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
    console.log("");
    done();
  }).catch((e) => {
    console.log(e);
    done();
  });
};

