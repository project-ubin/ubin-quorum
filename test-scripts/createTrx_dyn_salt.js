const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));

var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var SGDz = artifacts.require("./SGDz.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

var sha256 = require('js-sha256').sha256;

// set initial variables
var sender = u.getStashName(nodes, web3.eth.accounts[0]);
var receiver  = process.argv[6];
var receiver_acc = null;
//enable quick selection of receiver based on order in config.json
//bypass if full name of recever provided//
if (receiver.length === 1){
  receiver_acc = nodes[receiver].ethKey;
  receiver = nodes[receiver].stashName;
}
var amount  = process.argv[7];
var express = process.argv[8];
var directQueue = process.argv[9] === 1? true : false;
var txRef = process.argv[10];

nodesPseudoPub = u.removeMe(nodes, sender);
// nodesPrivateFor = u.removeOthers(nodes, receiver);
// remove central bank as well
nodesPrivateFor = nodes.filter((i) => { return i.stashName == receiver; });
console.log('nodesPrivateFor: '+nodesPrivateFor);

keysPseudoPub = u.getValueFromAllNodes(nodesPseudoPub, 'constKey');
keysPrivateFor = u.getValueFromAllNodes(nodesPrivateFor, 'constKey');

module.exports = (done) => {
  let paymentAgent = null;
  let sgdz = null;
  let currentNetwork = util.getCurrentNetwork(web3);
  let gridlocked = null;

  String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
      str = padString + str;
    return str;
  };

  let salt = u.generateSalt();
  // var salt = "cb06bf108dd249884188983c75186512".lpad("0", 32); // fixed salt for now
  var saltInt = parseInt(amount).toString(16).lpad("0", 32) + salt;
  var a = [];
  for (var i = 0; i < saltInt.length; i += 2) {
    a.push("0x" + saltInt.substr(i, 2));
  }
  var amountHash = "0x" + sha256(a.map((i) => { return parseInt(i, 16); }));

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    return SGDz.deployed();
  }).then((instance) => {
    sgdz = instance;

    util.colorLog("Submitting payment of "+amount+" for "+sender+" to "+receiver+"...", currentNetwork);
    util.colorLog("with salt: "+salt, currentNetwork);
    console.log(txRef, sender, receiver, amount, express, directQueue, "0x"+salt);
    return paymentAgent.submitPmt(txRef, sender, receiver, amount, express, directQueue, "0x"+salt,
                                  {gas: 1000000,
                                   privateFor: keysPrivateFor});
  }).then((result) => {
    gridlocked = result.logs[0].args.gridlocked;

    util.colorLog("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx, currentNetwork);
    util.colorLog(JSON.stringify(result.logs), currentNetwork);
    util.colorLog("");
    util.colorLog('[Payment event] txRef: '+util.hex2a(result.logs[0].args.txRef), currentNetwork);
    util.colorLog('[Payment event] gridlocked: '+gridlocked, currentNetwork);
    util.colorLog("", currentNetwork);

    return sgdz.submitShieldedPayment(txRef, receiver_acc, amountHash, true);
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber);
    console.log("logs: "+JSON.stringify(result.logs));

    //add to global queue. To simulate orchestration by app.js
    if (directQueue || gridlocked){
      util.colorLog("Submitting payment "+txRef+" to global queue...", currentNetwork);
      
      util.colorLog("keysPseudoPub :"+keysPseudoPub, currentNetwork);

      return paymentAgent.addToGlobalQueue(txRef, {privateFor: keysPseudoPub})
        .then((result) => {
          console.log(result);
          done();
        });
    } else {
      done();
    }
    return -1;
  }).catch((e) => {
    console.error(e);
    done();
  });
};
