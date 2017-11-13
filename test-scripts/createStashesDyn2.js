const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var SGDz = artifacts.require("./SGDz.sol");
var util = require('../util.js');
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
let cbConstKey = nodes.filter((i) => { return i.centralBank; })[0].constKey;
console.log('constellationKeys '+constellationKeys);
console.log('cbConstKey '+cbConstKey);

// let constellationKeys = u.getValueFromAllNodes(nodes, 'constKey').slice(1);

// console.log(nodes);
// console.log(constellationKeys);

// let ethKeys = u.getValueFromAllNodes(nodes, 'ethKey');
// let ethKeys = [];
// for (i in constellationKeys){
//   let eth = u.searchNode(nodes, 'constKey', constellationKeys[i], 'ethKey');
//   ethKeys.push(eth);
// }

// set initial variables
var stashCount = nodes.length - 1;// regulator node has no stash

module.exports = (done) => {
  let sgdz = null;
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    return SGDz.deployed();
  }).then((instance) => {
    sgdz = instance;

    util.colorLog("Querying stashes...\n", currentNetwork);

    return promiseFor((c) => {
      return c < nodes.length;
    }, (c) => {

      util.colorLog("Creating stash for " + nodes[c].stashName, currentNetwork);
      return paymentAgent.createStash(nodes[c].stashName,
                                      {privateFor: constellationKeys})
        .then((result) => {
          console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
          console.log("");


          util.colorLog("\tRegistering stash for " + nodes[c].stashName, currentNetwork);
          return paymentAgent.registerStash(nodes[c].ethKey,
                                            nodes[c].stashName,
                                            {privateFor: constellationKeys});
        }).then((result) => {
          console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
          console.log("");

          util.colorLog("\tMarking stash for " + nodes[c].stashName, currentNetwork);
          return paymentAgent.markStash(nodes[c].stashName,
                                         {privateFor: [constellationKeys[c], cbConstKey]})
            .then((result) => {
              console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
              console.log("");

              if (nodes[c].centralBank) {
                util.colorLog("\tSetting stash " + nodes[c].stashName + " as central bank", currentNetwork);
                return paymentAgent.setCentralBank(nodes[c].stashName, {privateFor: constellationKeys})
                  .then((result) => {
                    console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
                    console.log("");

                  //   return sgdz.setCentralBank(nodes[c].ethKey);
                  // }).then((result) => {
                  //   console.log("\tmined!, block: "+result.receipt.blockNumber+", tx hash: "+result.tx);
                  //   console.log("");

                    return ++c;
                  });
              } else {
                return ++c;
              }

            });
        });
    }, 0);

  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};
