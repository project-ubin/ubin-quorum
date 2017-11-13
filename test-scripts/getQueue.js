
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
var GridlockState = ['Inactive', 'Active', 'Onhold', 'Cancelled'];//from enum in sol
var PmtState = [ 'Pending', 'Confirmed', 'Onhold', 'Cancelled' ];

/*******use -a to show all payment details*********/
// e.g. truffle exec --network b getQueue2.js -a  //
// will only show TxRef if -a is omitted          //
if (process.argv[6] === '-a'){
  var showTxDtls = true;
}else var showTxDtls = false;

module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);

  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;
    
    util.colorLog("Querying gridlock queue depth...", currentNetwork);
    return paymentAgent.getGridlockQueueDepth.call();
  }).then((depth) => {
    util.colorLog('depth: '+depth, currentNetwork);
    util.colorLog('', currentNetwork);

    util.colorLog('Querying gridlock queue...\n', currentNetwork)
    return promiseFor((count) => {
      return count < depth;
    }, (count) => {
      return paymentAgent.gridlockQueue.call(count)
  .then((q_pmt) => {
    util.colorLog('txRef: '+util.hex2a(q_pmt), currentNetwork);
    if (showTxDtls){
      return paymentAgent.payments.call(q_pmt).then((pmt) => {
        util.colorLog('Sender: '+util.hex2a(pmt[1]), currentNetwork);
        util.colorLog('Receiver: '+util.hex2a(pmt[2]), currentNetwork);
        util.colorLog('Amount: '+pmt[3], currentNetwork);
        util.colorLog('Priority: '+pmt[5], currentNetwork);
        util.colorLog('Payment State: '+PmtState[pmt[4]], currentNetwork);
        util.colorLog('Timestamp: '+[pmt[7]], currentNetwork);
        util.colorLog('', currentNetwork);
        return ++count;
      });
    }
    return ++count;
  });
    }, 0);
        
  }).then(() => {
    done();
  }).catch((e) => {
    console.error(e);
    done();
  });
};

