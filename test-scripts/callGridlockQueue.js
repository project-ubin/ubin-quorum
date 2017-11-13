
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
var idx = process.argv[6];

module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);


  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;
    util.colorLog('Querying all payments for Bank ' + currentNetwork.toUpperCase() + '...\n', currentNetwork)
    // util.colorLog("Querying payment history length...", currentNetwork);
    return paymentAgent.gridlockQueue.call(idx);
  }).then((len) => {
    util.colorLog('value: '+util.hex2a(len));
    util.colorLog('', currentNetwork);
        
  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};



