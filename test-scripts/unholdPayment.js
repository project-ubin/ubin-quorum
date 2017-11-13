const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

// set initial variables
var txRef = process.argv[6];
let sender = u.getStashName(nodes, web3.eth.accounts[0]);       
let nodesPseudoPub = u.removeMe(nodes, sender);
var keysPseudoPub = u.getValueFromAllNodes(nodesPseudoPub, 'constKey');


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
        let receiver = util.hex2a(pmt[2]);
        let nodesPrivateFor = u.removeOthers(nodes, receiver);
        var keysPrivateFor = u.getValueFromAllNodes(nodesPrivateFor, 'constKey');
      }
      console.log("unholding payment "+txRef+"...");
      return paymentAgent.unholdPmt(txRef, {privateFor: keysPrivateFor});    
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
    console.log("");
    console.log('[Status event] holdStatus: '+result.logs[0].args.holdStatus);
    if (!result.logs[0].args.holdStatus) {
      return paymentAgent.unholdPmtFromGlobalQueue(result.logs[0].args.txRef,
        {privateFor: keysPseudoPub});
    }else {
      throw ('hold payment failed. Event did not return true');
    }
    done();
  }).catch((e) => {
    console.log(e);
    done();
  });
};

