const fs = require('fs');
var nodes = JSON.parse(fs.readFileSync('config/config.json', 'utf8'));
var PaymentAgent = artifacts.require("./PaymentAgent.sol");
var util = require('../util.js')
var Promise = require("bluebird");
var promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value)) return value;
  return action(value).then(promiseFor.bind(null, condition, action));
});

// set initial variables
var txRef = process.argv[6];
var GridlockState = ['Inactive', 'Active', 'Onhold', 'Cancelled'];//from enum in sol
var PmtState = [ 'Pending', 'Confirmed', 'Onhold', 'Cancelled' ];


module.exports = (done) => {
  let paymentAgent = null;
  let currentNetwork = util.getCurrentNetwork(web3);
  
  PaymentAgent.deployed().then((instance) => {
    paymentAgent = instance;


    return paymentAgent.payments.call(txRef);
  }).then((pmt) => {
    if(pmt[3] == 0){
      console.log('Trx '+txRef+' does not exist'); //assume no trx with 0 amount is sent
      done();
    }else{
      console.log('TxRef: '+util.hex2a(pmt[0]))
      console.log('Sender: '+util.hex2a(pmt[1]))
      console.log('Receiver: '+util.hex2a(pmt[2]))
      console.log('Amount: '+pmt[3])
      console.log('Priority: '+pmt[5])
      console.log('Payment State: '+PmtState[pmt[4]])
      console.log('Timestamp: '+(pmt[7]))

      return paymentAgent.globalGridlockQueue.call(txRef); 
    }
  }).then((pmt) => {
    if(pmt){
      console.log('Global Gridlock State: '+GridlockState[pmt[0]]);
    }
    console.log('\n');
  }).then(() => {

    done();
  }).catch((e) => {
    console.log(e);
    done();
  });
};
/*get values from the node object*/
function getConsKey (nodesObj, nodeName){
  for (var i in nodesObj){
    if (nodeName === nodesObj[i].stashName){
      return(nodesObj[i].constKey);
    }
  }
}
