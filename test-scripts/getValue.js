
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
    return paymentAgent.inactivationTracker.call();
  }).then((len) => {
    util.colorLog('inactivationTracker: '+len);
    util.colorLog('', currentNetwork);

    



  // });

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

        
  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};



