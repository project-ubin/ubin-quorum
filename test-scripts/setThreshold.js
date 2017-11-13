const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

// set initial variables
var gridlockThreshold = process.argv[6];
let sender = u.getStashName(nodes, web3.eth.accounts[0]);
let nodesPseudoPub = u.removeMe(nodes, sender);
var keysPseudoPub = u.getValueFromAllNodes(nodesPseudoPub, 'constKey');

module.exports = (done) => {
  let paymentAgent = null;
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    console.log("Setting gridlock resolution trigger to " + gridlockThreshold);
    return paymentAgent.setThreshold(gridlockThreshold, {privateFor: keysPseudoPub});
  }).then(() => {
    return paymentAgent.getThreshold.call();
  }).then((t) => {
    console.log("Threshold: "+t);
    console.log("");
    
    done();
  }).catch((e) => {
    console.log(e);
    done();
  });
};

