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
let salt = u.generateSalt();

bankName = nodes[bankIdx].stashName;
let j = u.searchNode(nodes, 'stashName', bankName);
var consKey = nodes[j].constKey;
console.log("consKey: " + consKey);
String.prototype.lpad = function(padString, length) {
  var str = this;
  while (str.length < length)
    str = padString + str;
  return str;
}

module.exports = (done) => {
  let paymentAgent = null;
  let sgdz = null;
  let currentNetwork = util.getCurrentNetwork(web3);
  let gridlocked = null;

  amountSalted = u.saltInt(parseInt(bal), salt);
  amountHash = u.hashData(amountSalted);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    return SGDz.deployed();
  }).then((instance) => {    
    sgdz = instance;    
    
    util.colorLog("Setting "+bankName+"'s shielded balance to " + bal + "...", currentNetwork);
       
    return sgdz.setShieldedBalance(nodes[j].ethKey, amountHash);
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber);
    
    console.log("setting currentSalt...");
    console.log("salt: "+salt);
    return paymentAgent.setCurrentSalt("0x"+salt, {privateFor: [consKey]});
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber);
    
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};
