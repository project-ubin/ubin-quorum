const fs = require('fs');
// var nodes = JSON.parse(fs.readFileSync('../../testnet.json', 'utf8'))['nodes'];

var PaymentAgent = artifacts.require(".../../PaymentAgent.sol");
var util = require('../util.js')

var Promise = require("bluebird");
var promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value)) return value;
  return action(value).then(promiseFor.bind(null, condition, action));
});

module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);
  
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;

    util.colorLog("Querying payment history...", currentNetwork);
    return paymentAgent.getHistoryLength.call();
  }).then((len) => {
    util.colorLog('length: '+len, currentNetwork);
    util.colorLog('', currentNetwork);

    util.colorLog('Querying global gridlock queue...', currentNetwork)
    return promiseFor((count) => {
      return count < len;
    }, (count) => {
      return paymentAgent.pmtIdx.call(count)
	.then((q_pmt) => {
	  return paymentAgent.payments.call(q_pmt);
	}).then((pmt) => {
	  var state = pmt[4];
	  if (state == 0) { // pending payment
	    util.colorLog('txRef: '+util.hex2a(pmt[0]), currentNetwork);
	    util.colorLog('Sender: '+util.hex2a(pmt[1]), currentNetwork)
	    util.colorLog('Receiver: '+util.hex2a(pmt[2]), currentNetwork)
	    util.colorLog('Amount: '+pmt[3], currentNetwork)
	    return paymentAgent.globalGridlockQueue.call(pmt[0]).then((pmt) => {
	      if (pmt[0] == 1) util.colorLog('Gridlock State: Active', currentNetwork);
	      else if (pmt[0] == 0) util.colorLog('Gridlock State: Inactive', currentNetwork);
	      util.colorLog('', currentNetwork);
	      return ++count;
	    });	    
	  } else {
	    return ++count;	    
	  }
	});
    }, 0);
    
  }).then(() => {
    done();
    
  }).catch((e) => {
    console.log(e);
    done();
  });
};
