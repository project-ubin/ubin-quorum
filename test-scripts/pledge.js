const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));

var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var SGDz = artifacts.require("./SGDz.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

var sha256 = require('js-sha256').sha256;

// set initial variables
var bankIdx = process.argv[6];
var bal = process.argv[7];

var stashName = nodes[bankIdx].stashName;
let j = u.searchNode(nodes, 'stashName', stashName);
var consKey = [];

if (!nodes[bankIdx].centralBank){
    consKey.push(nodes[j].constKey);
} else{
    nodes = u.removeMe(nodes, 'MASGSGSG');
    consKey = u.getValueFromAllNodes(nodes, 'constKey');
}

console.log('constKey: ');
console.log(consKey);

module.exports = (done) => {
  let paymentAgent = null;
  let sgdz = null;
  let currentNetwork = util.getCurrentNetwork(web3);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    util.colorLog("Setting "+stashName+"'s stash balance to " + bal + "...", currentNetwork);

    return paymentAgent.pledge('R'+Date.now(), stashName, bal, {gas: 1000000,
								privateFor: consKey});
  }).then((result) => {
    util.colorLog("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx, currentNetwork);
    util.colorLog("");

    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};
