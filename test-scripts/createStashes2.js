const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));

var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js')
var u = require('./test-utils.js');
var Promise = require("bluebird");
var promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value)) return value;
  return action(value).then(promiseFor.bind(null, condition, action));
});

//remove trx sender.
let currentNetwork = util.getCurrentNetwork(web3);

let stashName = u.getStashName(nodes, web3.eth.accounts[0]);
nodes = u.removeMe(nodes, stashName);
let constellationKeys = u.getValueFromAllNodes(nodes, 'constKey');

//hardcode for now
//to refactor using bluebird promiseFor
let n = 0;

module.exports = (done) => {
  let paymentAgent = null;
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;


    return promiseFor((n) => {
      return n < nodes.length;
    }, (n) => {

        util.colorLog("Creating stash for " + nodes[n].stashName, currentNetwork);
        return paymentAgent.createStash(nodes[n].stashName, {privateFor: constellationKeys});
      }).then((result) => {
        console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
        console.log("");

        util.colorLog("Marking stash for " + nodes[n].stashName, currentNetwork);
        return paymentAgent.markStash(nodes[n].stashName, {privateFor: [nodes[n].constKey]});
      }).then((result) => {
        console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
        console.log("");

        ++n

      });
  },0);


  //   util.colorLog("Creating stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.createStash(nodes[n].stashName, {privateFor: constellationKeys});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   util.colorLog("Marking stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.markStash(nodes[n].stashName, {privateFor: [nodes[n].constKey]});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   n++;

  //   util.colorLog("Creating stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.createStash(nodes[n].stashName, {privateFor: constellationKeys});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   util.colorLog("Marking stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.markStash(nodes[n].stashName, {privateFor: [nodes[n].constKey]});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   n++;

  //   util.colorLog("Creating stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.createStash(nodes[n].stashName, {privateFor: constellationKeys});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   util.colorLog("Marking stash for " + nodes[n].stashName, currentNetwork);
  //   return paymentAgent.markStash(nodes[n].stashName, {privateFor: [nodes[n].constKey]});
  // }).then((result) => {
  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
  //   console.log("");

  //   done();
  }).catch((e) => {
    console.error(e);
    done();
  });
}


