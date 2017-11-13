import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import Error from '../model/error';
import { formatDate } from '../utils/dataUtils';
import getLogger from '../utils/logger';
import * as collection from '../model/enum';
const logger = getLogger('QueueAdapter');

export function addToGlobalQueue(transaction, counterparties) {

  let paymentAgent = contracts.getContract('PaymentAgent');
  return new Promise((resolve, reject) => {
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      paymentAgent.addToGlobalQueue(transaction.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: counterparties
        }).then((result) => {
          logger.debug(`add to global queue response: ${JSON.stringify(result)}`);
          resolve(true);
        })
        .catch((exception) => {
          logger.error(exception);
          reject(new Error(200, "unable to add transaction to global queue"));
        });;
    })
  });
}

export function getGridlockQueue() {
  logger.info('get payment in gridlock queue');
  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.getGridlockQueueDepth.call();
    }).then((depth) => {
      logger.debug(`gridlock queue depth: ${depth}`);
      const qridlockItemPromises = [];
      for (let count = 0; count < depth; count++) {
        qridlockItemPromises.push(new Promise((resolve) => {
          let transaction = new Transaction();
          paymentAgent.gridlockQueue.call(count)
            .then((q_pmt) => {
              transaction.transId = web3.toAscii(q_pmt).replace(/\u0000/g, '');
              logger.debug("transacton id(raw): " + q_pmt);
              logger.debug("transacton id(ascii): " + transaction.transId);

              return paymentAgent.payments.call(q_pmt);
            })
            .then((pmt) => {
              logger.debug(`payment details for ${transaction.transId} : ${JSON.stringify(pmt)}`);
              transaction.sender = web3.toAscii(pmt[1]).replace(/\u0000/g, '');
              transaction.receiver = web3.toAscii(pmt[2]).replace(/\u0000/g, '');
              transaction.transactionAmount = parseInt(pmt[3]);
              transaction.priority = parseInt(pmt[5]);
              transaction.status = collection.PaymentStatus.get(parseInt(pmt[4]));
              transaction.salt = pmt[8].slice(2);
              transaction.requestedDate = formatDate(pmt[7]);
              transaction.updatedDate = formatDate(pmt[7]);
              resolve(transaction);
            });
        }));
      }
      Promise.all(qridlockItemPromises).then((result) => {
        resolve(result);
      }).catch((exception) => {
        reject(new Error(201, "unable to get gridlock queue"));
      });
    });
  });
}

export function getHoldGridlockQueue() {
  logger.info('get hold payment in gridlock queue');

  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.getOnholdCount.call();
    }).then((depth) => {
      logger.debug(`onhold queue depth: ${depth}`);
      const onholdItemPromises = [];
      for (let count = 0; count < depth; count++) {
        onholdItemPromises.push(new Promise((resolve) => {
          let transaction = new Transaction();
          paymentAgent.onholdPmts.call(count)
            .then((q_pmt) => {
              transaction.transId = web3.toAscii(q_pmt).replace(/\u0000/g, '');
              return paymentAgent.payments.call(q_pmt);
            })
            .then((pmt) => {
              logger.debug(`payment details for ${transaction.transId} : ${JSON.stringify(pmt)}`);
              transaction.sender = web3.toAscii(pmt[1]).replace(/\u0000/g, '');
              transaction.receiver = web3.toAscii(pmt[2]).replace(/\u0000/g, '');
              transaction.transactionAmount = parseInt(pmt[3]);
              transaction.priority = parseInt(pmt[5]);
              transaction.status = collection.PaymentStatus.get(parseInt(pmt[4]));
              transaction.salt = pmt[8].slice(2);
              transaction.requestedDate = formatDate(pmt[7]);
              transaction.updatedDate = formatDate(pmt[7]);
              resolve(transaction);
            }).catch((exception) => {
              logger.error(exception);
              reject(exception);
            });
        }));
      }
      Promise.all(onholdItemPromises).then((result) => {
        resolve(result);
      }).catch((exception) => {
        reject(new Error(202, "unable to get hold queue"));
      });
    });
  });
}

export function cancelPayment(payment, activeNodes) {

  let receiverConfig = config.allNodes.filter((item) => item.stashName == payment.receiver)[0];

  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.cancelPmt(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: [receiverConfig.constKey]
        })
    }).then((result) => {
      logger.debug(`cancel payment ${payment.transId} response: ${JSON.stringify(result)}`);
      return paymentAgent.cancelPmtFromGlobalQueue(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: activeNodes
        })
    }).then((globalCancelResult) => {
      logger.debug(`global cancel payment ${payment.transId} response: ${JSON.stringify(globalCancelResult)}`);
      resolve(true);
    }).catch((exception) => {
      logger.error(`unable to cancel payment: ${exception}`);
      reject(new Error(203, "unable to cancel payment in queue"));
    });
  });
}

export function holdPayment(payment, activeNodes) {

  let receiverConfig = config.allNodes.filter((item) => item.stashName == payment.receiver)[0];

  logger.info(`hold payment ${payment.transId}`);

  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.holdPmt(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: [receiverConfig.constKey]
        })
    }).then((result) => {
      logger.debug(`hold payment response: ${JSON.stringify(result)}`);
      return paymentAgent.holdPmtFromGlobalQueue(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: activeNodes
        })
    }).then((globalHoldResult) => {
      logger.debug(`global hold payment response: ${JSON.stringify(globalHoldResult)}`);
      resolve(true);
    }).catch((exception) => {
      logger.error(`unable to hold payment: ${exception}`);
      reject(new Error(204, "unable to hold payment"));
    });
  });
}


export function unholdPayment(payment, activeNodes) {

  let paymentAgent = contracts.getContract('PaymentAgent');
  let receiverConfig = config.allNodes.filter((item) => item.stashName == payment.receiver)[0];

  logger.info(`unhold payment ${payment.transId}`);

  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');
    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.unholdPmt(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: [receiverConfig.constKey]
        })
    }).then((result) => {
      logger.debug(`unhold payment response: ${JSON.stringify(result)}`);
      return paymentAgent.unholdPmtFromGlobalQueue(payment.transId,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: activeNodes
        })
    }).then((globalUnholdResult) => {
      logger.debug(`global hold payment response: ${JSON.stringify(globalUnholdResult)}`);
      resolve(true);
    }).catch((exception) => {
      logger.error(`unable to unhold payment: ${exception}`);
      reject(new Error(205, "unable to unhold payment"));
    });
  });
}


export function updatePriority(payment, activeNodes) {

  let receiverConfig = config.allNodes.filter((item) => item.stashName == payment.receiver)[0];  

  return new Promise((resolve, reject) => {
    let paymentAgent = contracts.getContract('PaymentAgent');

    paymentAgent.deployed().then((instance) => {
      paymentAgent = instance;
      return paymentAgent.updatePriority(payment.transId, payment.priority,
        {
          from: config.myConfig.ethKey,
          gas: config.appConfig.defaultGas,
          privateFor: [receiverConfig.constKey]
        });
    }).then((result) => {
      logger.info(`Update priority of ${payment.transId} response: ${JSON.stringify(result)}`);
      resolve(true);
    }).catch((exception) => {
      logger.error(`unable to unhold payment: ${exception}`);
      reject(new Error(206, "unable to update payment priority"));
    });
  });
}