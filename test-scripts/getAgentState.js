
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

module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;
    
    util.colorLog("Getting agent state...\n", currentNetwork);
    return paymentAgent.getAgentState.call();
  }).then((status) => {
    util.colorLog("Agent State: " + status, currentNetwork)

  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};




