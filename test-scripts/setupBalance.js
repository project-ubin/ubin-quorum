const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));

var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var SGDz = artifacts.require("./SGDz.sol");
var util = require('../util.js');
var u = require('./test-utils.js');

var sha256 = require('js-sha256').sha256;

// set initial variables
// var sender = u.getStashName(nodes, web3.eth.accounts[0]);
// var receiver  = process.argv[6];
// var receiver_acc = null;
// set initial variables
var bankIdx = process.argv[6];
var bal = process.argv[7];
// bal = bal < 1 ? 1 : bal; //balance can't be zero
var saltStr = "cb06bf108dd249884188983c75186512";// fixed salt for now
// //enable quick selection of receiver based on order in config.json
// //bypass if full name of recever provided//
// if (receiver.length === 1){
//   receiver_acc = nodes[receiver].ethKey;
//   receiver = nodes[receiver].stashName;
// }
// var amount  = process.argv[7];
// var express = process.argv[8];
// var directQueue = process.argv[9] === 1? true : false;
// var txRef = process.argv[10];

// nodesPseudoPub = u.removeMe(nodes, sender);
// nodesPrivateFor = u.removeOthers(nodes, receiver);
// keysPseudoPub = u.getValueFromAllNodes(nodesPseudoPub, 'constKey');
// keysPrivateFor = u.getValueFromAllNodes(nodesPrivateFor, 'constKey');



stashName = nodes[bankIdx].stashName;
let j = u.searchNode(nodes, 'stashName', stashName);
var consKey = nodes[j].constKey;

console.log('bankIdx: ' + bankIdx);

String.prototype.lpad = function(padString, length) {
  var str = this;
  while (str.length < length)
    str = padString + str;
  return str;
};

module.exports = (done) => {
  let paymentAgent = null;
  let sgdz = null;
  let currentNetwork = util.getCurrentNetwork(web3);
  let gridlocked = null;
  var salt = saltStr.lpad("0", 32);
  var saltInt = parseInt(bal).toString(16).lpad("0", 32) + salt;
  var a = [];
  for (var i = 0; i < saltInt.length; i += 2) {
    a.push("0x" + saltInt.substr(i, 2));
  }
  var amountHash = "0x" + sha256(a.map((i) => { return parseInt(i, 16); }));

  var allConstKeys;
  if (stashName == 'MASGSGSG') {
    allConstKeys = nodes.filter((i) => { return !i.centralBank; }).map((i) => { return i.constKey; });
  } else {
    allConstKeys = [consKey];
  }

  console.log('allConstKeys ' + allConstKeys);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    return SGDz.deployed();
  }).then((instance) => {
    sgdz = instance;

    util.colorLog("Setting "+stashName+"'s stash balance to " + bal + "...", currentNetwork);

    return paymentAgent.pledge(stashName, bal, {gas: 1000000,
                                                privateFor: allConstKeys});
  }).then((result) => {
    util.colorLog("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx, currentNetwork);
    util.colorLog("");

    // util.colorLog("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx, currentNetwork);
    util.colorLog(JSON.stringify(result.logs), currentNetwork);
    util.colorLog("");

    return sgdz.setShieldedBalance(nodes[j].ethKey, amountHash);
  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber);

    console.log("setting currentSalt...");
    console.log("salt: "+salt);
    if (nodes[bankIdx].centralBank) {
      return paymentAgent.setCentralBankCurrentSalt("0x"+salt, {privateFor: allConstKeys});  
    } else {
      return paymentAgent.setCurrentSalt("0x"+salt, {privateFor: allConstKeys});  
    }

  }).then((result) => {
    console.log("\tmined!, block: "+result.receipt.blockNumber);

    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};
