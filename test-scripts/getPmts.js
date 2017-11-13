
const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js');

var Promise = require("bluebird");
var promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value)) return value;
  return action(value).then(promiseFor.bind(null, condition, action));
});

// set initial variables
// var stashCount = nodes.length - 1;//assume central bank has no stash
var GridlockState = ['Inactive', 'Active', 'Onhold', 'Cancelled'];//from enum in sol
var PmtState = [ 'Pending', 'Confirmed', 'Onhold', 'Cancelled' ];
var txRef;

module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);


  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;
    util.colorLog('Querying all payments for Bank ' + currentNetwork.toUpperCase() + '...\n', currentNetwork)
    // util.colorLog("Querying payment history length...", currentNetwork);
    return paymentAgent.getHistoryLength.call();
  }).then((len) => {
    util.colorLog('Total Payments: '+len, currentNetwork);
    util.colorLog('', currentNetwork);

    

    return promiseFor((count) => {
      return count < len;
    }, (count) => {
      return paymentAgent.pmtIdx.call(count)
  .then((q_pmt) => {
    txRef = q_pmt;
    util.colorLog('txRef: '+util.hex2a(q_pmt), currentNetwork);

    return paymentAgent.payments.call(q_pmt);
  }).then((pmt) => {
    util.colorLog('Sender: '+util.hex2a(pmt[1]), currentNetwork)
    util.colorLog('Receiver: '+util.hex2a(pmt[2]), currentNetwork)
    util.colorLog('Amount: '+pmt[3], currentNetwork)
    util.colorLog('Priority: '+pmt[5], currentNetwork);
    let d = new Date(parseInt(pmt[7]));
    util.colorLog('Timestamp: '+ d, currentNetwork);
    util.colorLog('Payment State: '+PmtState[pmt[4]], currentNetwork);
    
    return paymentAgent.globalGridlockQueue.call(txRef); 
  }).then((pmt) => {
    if(pmt){
      util.colorLog('Global Gridlock State: '+GridlockState[pmt[0]], currentNetwork);
    }
    console.log('\n');
    return ++count;


  });

  // PaymentAgent.deployed().then((instance) => {
  //   paymentAgent = instance;
    
  //   util.colorLog("Querying stashes...\n", currentNetwork);

  //   return promiseFor((count) => {
  //     return count < stashCount;
  //   }, (count) => {
  //     return paymentAgent.stashNames.call(count)
  //   .then((stashName) => {
  //     util.colorLog('stash: '+util.hex2a(stashName), currentNetwork);

  //     return paymentAgent.getBalance.call(stashName).then((bal) => {
  //     util.colorLog('balance: ' + bal, currentNetwork);

  //       return paymentAgent.getPosition.call(stashName).then((pos) => {
  //       util.colorLog('position: ' + pos, currentNetwork);
  //       util.colorLog('\n');
  //       return ++count;
  //     });
  //   });      

  // });
    }, 0);
        
  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};



