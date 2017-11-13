import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import { formatDate } from '../utils/dataUtils';
import getLogger from '../utils/logger';
import * as collection from '../model/enum';
import Error from '../model/error';

const logger = getLogger('PaymentAdapter');


export function submitPayment(transaction, salt) {

    let paymentAgent = contracts.getContract('PaymentAgent');
    let receiverBankConfig = config.allNodes.filter((item) => item.stashName == transaction.receiver)[0];
    let submittedSalt = "0x" + salt;

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            logger.debug(`submitting payment: ${JSON.stringify(transaction)}`);
            return paymentAgent.submitPmt(transaction.transId, transaction.sender, transaction.receiver, transaction.transactionAmount, transaction.priority, transaction.enqueue, submittedSalt, {
                gas: config.appConfig.defaultGas,
                from: config.myConfig.ethKey,
                privateFor: [receiverBankConfig.constKey]
            });

        }).then((result) => {
            logger.debug(`submit payment response: ${JSON.stringify(result)}`);
            if (typeof result.logs[0].args.errorCode != "undefined") {
                reject(new Error(400, "bank is suspended"));
            }
            else {
                resolve(result);
            }
        }).catch((exception) => {
            logger.error("submit payment failure: " + exception);
            reject(new Error(100, "unable to submit payment"));
        });
    });

}

export function submitShieldedPayment(transId, receiver, amountHash, enqueue) {
    let sgdZ = contracts.getContract('SGDz');
    let receiverConfig = config.allNodes.filter((item) => item.stashName == receiver)[0];
    logger.info(`submitting shielded payment ${transId}`);

    return new Promise((resolve, reject) => {
        sgdZ.deployed().then((instance) => {
            sgdZ = instance;
            sgdZ.submitShieldedPayment(transId, receiverConfig.ethKey, amountHash, enqueue, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas
            }).then((shieldedPayment) => {
                logger.debug(`submit shielded payment(${transId}) response: ${JSON.stringify(shieldedPayment)}`);
                resolve(true);
            }).catch((exception) => {
                logger.error(`exception in submit shielded payment(${transId}) : ${exception}`);
                reject(new Error(101, "unable to submit shielded payment"));
            });
        });
    });
}


export function submitProposal(proof, transId, startBalanceHash, endBalanceHash) {

    let sgdZ = contracts.getContract('SGDz');

    return new Promise((resolve, reject) => {
        sgdZ.deployed().then((instance) => {
            sgdZ = instance;
            sgdZ.submitProposal(proof, transId, startBalanceHash, endBalanceHash, false,
                {
                    from: config.myConfig.ethKey,
                    gas: config.appConfig.defaultGas
                }).then((proposal) => {
                    logger.debug(`submit proposal(${transId}) response: ${JSON.stringify(proposal)}`);
                    resolve(true);
                }).catch((exception) => {
                    logger.error(`exception in submit shielded payment(${transId}) : ${exception}`)
                    reject(new Error(102, "unable to submit proposal"));
                });
        });
    });
}

export function getPaymentDetails(transId) {
    let paymentAgent = contracts.getContract('PaymentAgent');
    let transaction = new Transaction();
    transaction.transId = transId;

    logger.info(`get payment details for ${transId}`);

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.payments.call(transId);
        }).then((payment) => {
            transaction.sender = web3.toAscii(payment[1]).replace(/\u0000/g, '');
            transaction.receiver = web3.toAscii(payment[2]).replace(/\u0000/g, '');
            transaction.transactionAmount = parseInt(payment[3]);
            transaction.priority = parseInt(payment[5]);
            transaction.status = collection.PaymentStatus.get(parseInt(payment[4]));
            transaction.requestedDate = formatDate(payment[7]);
            transaction.updatedDate = formatDate(payment[7]);
            transaction.salt = payment[8].slice(2);
            resolve(transaction);
        }).catch((exception) => {
            logger.error(`exception in submit shielded payment(${transId}) : ${exception}`);
            reject(new Error(103, "unable to get payment details"));
        });
    });
}

export function confirmPayment(transId, sender) {
    let paymentAgent = contracts.getContract('PaymentAgent');

    return new Promise((resolve, reject) => {

        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;

            return paymentAgent.confirmPmt(transId, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: [sender]
            });
        }).then((confirmedPayment) => {
            logger.debug(`confirm payment response: ${confirmedPayment}`);
            resolve(true);
        }).catch((exception) => {
            logger.error(`exception in confirm payment(${transId}) : ${exception}`);
            reject(new Error(104, "unable to confirm payment"));
        });
    });
}


export function releasePayment(transId, activeNodes) {
    let paymentAgent = contracts.getContract('PaymentAgent');

    return new Promise((resolve, reject) => {

        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;

            return paymentAgent.releasePmt(transId, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: activeNodes
            })

        }).then((result) => {
            logger.debug(`release payment response: ${result}`);
            resolve(true);
        }).catch((exception) => {
            logger.error(`exception in release payment(${transId}) : ${exception}`);
            reject(new Error(105, "unable to release payment"));
        });
    });
}



export function pledge(transaction) {

    let paymentAgent = contracts.getContract('PaymentAgent');
    let receiverConfig = config.allNodes.filter((item) => item.stashName == transaction.receiver)[0];

    logger.info(`pledge ${transaction.transactionAmount} to ${transaction.receiver}`);

    return new Promise((resolve, reject) => {

        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;

            return paymentAgent.pledge(transaction.transId, transaction.receiver, transaction.transactionAmount, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: [receiverConfig.constKey]

            }).then((result) => {
                logger.debug(`pledge response: ${result}`);
                resolve(true);
            }).catch((exception) => {
                logger.error(exception);
                reject(new Error(106, "unable to pledge"));
            });
        });
    });
}



export function redeem(transaction) {

    let paymentAgent = contracts.getContract('PaymentAgent');
    let senderConfig = config.allNodes.filter((item) => item.stashName == transaction.sender)[0];

    logger.info(`redeem ${transaction.transactionAmount} to ${transaction.sender}`);

    return new Promise((resolve, reject) => {

        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;

            return paymentAgent.redeem(transaction.transId, transaction.sender, transaction.transactionAmount, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: [senderConfig.constKey]

            }).then((result) => {
                logger.debug(`redeem response: ${result}`);
                resolve(true);
            }).catch((exception) => {
                logger.error(exception);
                reject(new Error(107, "unable to redeem"));
            });
        });
    });
}



export function getPledgeHistory() {
    logger.info(`get pledges history`);
    return new Promise((resolve) => {
        let paymentAgent = contracts.getContract('PaymentAgent');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getPledgeHistoryLength.call();
        }).then((pledgeLen) => {
            //create array to populate and return, using same struc as payments
            let allPledges = [];
            for (let count = 0; count < pledgeLen; count++) {

                allPledges.push(new Promise((resolve) => {
                    let transaction = new Transaction();
                    paymentAgent.pledgeIdx.call(count)
                        .then((pledgeRef) => {
                            transaction.transId = web3.toAscii(pledgeRef).replace(/\u0000/g, '');
                            return paymentAgent.pledges.call(pledgeRef);
                        })
                        .then((pledge) => {
                            transaction.transType = collection.TransType.PLEDGE;
                            transaction.sender = config.centralBankConfig.stashName;
                            transaction.receiver = web3.toAscii(pledge[1]).replace(/\u0000/g, '');
                            transaction.transactionAmount = + pledge[2];
                            transaction.status = collection.PaymentStatus.get(1);;
                            transaction.updatedDate = formatDate(pledge[3]);
                            transaction.requestedDate = formatDate(pledge[3]);
                            resolve(transaction);
                        }).catch((exception) => {
                            logger.error(exception);
                            reject(exception);
                        });
                }));
            }
            Promise.all(allPledges).then((result) => {
                logger.debug(`Pledge transaction history: ${JSON.stringify(result)}`);
                resolve(result);
            }).catch((exception) => {
                logger.error(`exception in retrieving pledge history: ${exception}`);
                reject(new Error(108, "unable to get pledge history"));
            });
        });
    });
}

export function getRedeemHistory() {

    logger.info(`get redeems history`);

    return new Promise((resolve) => {
        let paymentAgent = contracts.getContract('PaymentAgent');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getRedeemHistoryLength.call();
        }).then((redeemLen) => {
            logger.debug(`redeem length: ${redeemLen}`);
            const allRedeems = [];
            for (let count = 0; count < redeemLen; count++) {
                allRedeems.push(new Promise((resolve) => {
                    let transaction = new Transaction();
                    paymentAgent.redeemIdx.call(count)
                        .then((redeemRef) => {
                            transaction.transId = web3.toAscii(redeemRef).replace(/\u0000/g, '');
                            return paymentAgent.redeems.call(redeemRef);
                        })
                        .then((redeem) => {
                            transaction.transType = collection.TransType.REDEEM;
                            transaction.sender = web3.toAscii(redeem[1]).replace(/\u0000/g, '');;
                            transaction.receiver = config.centralBankConfig.stashName;
                            transaction.transactionAmount = + redeem[2];
                            transaction.status = collection.PaymentStatus.get(1);
                            transaction.updatedDate = formatDate(redeem[3]);
                            transaction.requestedDate = formatDate(redeem[3]);
                            resolve(transaction);
                        }).catch((exception) => {
                            logger.error(exception);
                            reject(exception);
                        });
                }));
            }
            Promise.all(allRedeems).then((result) => {
                logger.debug(`Redeem transaction history: ${JSON.stringify(result)}`);
                resolve(result);
            }).catch((exception) => {
                logger.error(`exception in retrieving redeem history: ${exception}`);
                reject(new Error(109, "unable to get redeem history"));
            });
        });
    });
}


export function getPaymentHistory() {
    logger.info(`get payments history`);
    return new Promise((resolve) => {
        let paymentAgent = contracts.getContract('PaymentAgent');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getHistoryLength.call();
        }).then((len) => {
            let allTransactions = [];
            for (let count = 0; count < len; count++) {
                allTransactions.push(new Promise((resolve) => {
                    let transaction = new Transaction();

                    paymentAgent.pmtIdx.call(count)
                        .then((pmtRef) => {
                            transaction.transId = web3.toAscii(pmtRef).replace(/\u0000/g, '');
                            return paymentAgent.payments.call(pmtRef);
                        })
                        .then((pmt) => {
                            transaction.transType = collection.TransType.TRANSFER;
                            transaction.sender = web3.toAscii(pmt[1]).replace(/\u0000/g, '');
                            transaction.receiver = web3.toAscii(pmt[2]).replace(/\u0000/g, '');
                            transaction.transactionAmount = pmt[3];
                            transaction.status = collection.PaymentStatus.get(parseInt(pmt[4]));
                            transaction.priority = parseInt(pmt[5]);
                            transaction.updatedDate = formatDate(pmt[7]);
                            transaction.requestedDate = formatDate(pmt[7]);
                            resolve(transaction);
                        }).catch((exception) => {
                            logger.error(exception);
                            reject(exception);
                        });
                }));
            }
            Promise.all(allTransactions).then((result) => {
                logger.debug(`Payment transaction history: ${JSON.stringify(result)}`);
                resolve(result);
            }).catch((exception) => {
                logger.error(`exception in retrieving payment history: ${exception}`);
                reject(new Error(109, "unable to get payment history"));
            });
        });
    });
}
