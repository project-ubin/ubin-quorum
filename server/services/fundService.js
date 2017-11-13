import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import Error from '../model/error';
import {saltInt, hashData, generateSalt} from '../utils/dataUtils';
import { getLogger } from '../utils/logger';
import * as collection from '../model/enum';
import { getActiveCounterparties, getSaltandBalance, getShieldedBalance, isBankSuspended, setShieldedBalance, queryBalanceByStash, setCurrentSalt, setNettingSalt, createProof } from '../adapter/networkAdapter';
import { submitPayment, submitShieldedPayment, submitProposal, getPaymentDetails, confirmPayment, releasePayment, pledge, redeem } from '../adapter/paymentAdapter';
import { addToGlobalQueue, getGridlockQueue } from '../adapter/queueAdapter';
const logger = getLogger("FundService");

export function processPayment(request) {

    let paymentRef = 'R' + Date.now() + "1";
    let transaction = new Transaction();

    transaction.transactionAmount = parseInt(request.transactionAmount);
    transaction.priority = parseInt(request.priority);
    transaction.enqueue = parseInt(request.enqueue);
    transaction.priority = request.priority;
    transaction.sender = config.myConfig.stashName;
    transaction.receiver = request.receiver;
    transaction.transId = paymentRef;

    let salt = generateSalt();
    let amountSalted = saltInt(transaction.transactionAmount, salt);
    let amountHash = hashData(amountSalted);
    let counterparties;

    logger.info(`submit payment with amount SGD ${request.transactionAmount} to ${request.receiver}`);

    return new Promise((resolve, reject) => {
        getActiveCounterparties().then((activeNodes) => {
            counterparties = activeNodes;
            return submitPayment(transaction, salt);
        }).then((paymentResult) => {
            let startBalanceHash;
            let endBalanceHash;

            if (paymentResult.logs[0].args.gridlocked) {
                addToGlobalQueue(transaction, counterparties).then((result) => {
                    transaction.status = collection.PaymentStatus.ACTIVE;

                    return submitShieldedPayment(transaction.transId, transaction.receiver, amountHash, true);
                }).then((sspResponse) => {
                    resolve(transaction);
                }).catch((exception) => {
                    logger.error(exception);
                    reject(exception);
                });
            } else {
                submitShieldedPayment(transaction.transId, transaction.receiver, amountHash, false).then((sspResponse) => {
                    return getSaltandBalance();
                }).then((data) => {

                    let currentSalt = data.salt;
                    let startBalance = data.balance;
                    let startBalanceSalted = saltInt(startBalance, currentSalt);
                    startBalanceHash = hashData(startBalanceSalted);
                    let endBalance = startBalance - transaction.transactionAmount;
                    let endBalanceSalted = saltInt(endBalance, salt);
                    endBalanceHash = hashData(endBalanceSalted);

                    return createProof(endBalanceHash, amountHash, startBalanceHash, endBalanceSalted, amountSalted, startBalanceSalted);
                }).then((proof) => {
                    return submitProposal(proof, transaction.transId, startBalanceHash, endBalanceHash);
                }).then((proposal) => {
                    transaction.status = collection.PaymentStatus.ACTIVE;
                    resolve(transaction);
                }).catch((exception) => {
                    logger.error(exception);
                    reject(exception);
                });
            }
        })
        .catch((exception) => {
            logger.error(exception);
            reject(exception);
        });
    });
}


export function verifyShieldPayment(request) {

    let transId = web3.toAscii(request.pmtRef);
    let receiver = request.receiver;
    let sender = request.sender;

    let currentSalt;
    let salt;
    let startBalance;
    let startBalanceHash;
    let amountHash;
    let endBalanceHash;

    logger.info(`Verifying transaction: ${transId}`);
    let senderConfig = config.allNodes.filter((item) => item.ethKey == sender);
    return new Promise((resolve, reject) => {
        getSaltandBalance().then((data) => {
            currentSalt = data.salt;
            startBalance = data.balance;
            return getPaymentDetails(transId);
        }).then((payment) => {
            salt = payment.salt;
            let startBalanceHex = saltInt(startBalance, currentSalt);
            startBalanceHash = hashData(startBalanceHex);

            let amount = payment.transactionAmount;
            let amountHex = saltInt(amount, salt);
            amountHash = hashData(amountHex);

            let endBalance = startBalance + amount;
            let endBalanceHex = saltInt(endBalance, salt);
            endBalanceHash = hashData(endBalanceHex);

            return createProof(startBalanceHash, amountHash, endBalanceHash, startBalanceHex, amountHex, endBalanceHex);
        }).then((proof) => {
            return submitProposal(proof, transId, startBalanceHash, endBalanceHash);
        }).then((proposalResponse) => {
            resolve(true);
        }).catch((exception) => {
            logger.error(exception);
            reject(exception);
        });
    });
};


export function settleQueuedPayments() {

    let currentSalt;
    let currentBalance;
    let settledPayments = [];

    logger.info("settling outgoing payment in queue");

    return new Promise((resolve, reject) => {

        getGridlockQueue().then((payments) => {
            let activePayment = payments.filter((payment) => (payment.sender == config.myConfig.stashName && payment.status == collection.PaymentStatus.ACTIVE));
            return activePayment.reduce((promise, payment, count) => {
                return promise.then((result) => {
                    logger.debug(`processing payment # ${count} : ${payment.transId}`);
                    let startBalanceHash;
                    let endBalanceHash;
                    let amountHash;

                    return getSaltandBalance().then((data) => {

                        let currentBalance = data.balance;
                        let currentSalt = data.salt;
                        if ((currentBalance - payment.transactionAmount) < 0) {
                            return Promise.reject("not enough balance");
                        }

                        let startBalance = data.balance;
                        let startBalanceHex = saltInt(startBalance, currentSalt);

                        startBalanceHash = hashData(startBalanceHex);

                        let amountHex = saltInt(payment.transactionAmount, payment.salt);
                        amountHash = hashData(amountHex);

                        let endBalance = startBalance - payment.transactionAmount;
                        let endBalanceHex = saltInt(endBalance, payment.salt);
                        endBalanceHash = hashData(endBalanceHex);

                        return createProof(endBalanceHash, amountHash, startBalanceHash, endBalanceHex, amountHex, startBalanceHex);

                    }).then((proof) => {
                        return submitProposal(proof, payment.transId, startBalanceHash, endBalanceHash);
                    }).then((proposal) => {
                        settledPayments.push(payment);
                        return delay(config.appConfig.settleTimeout);
                    });
                }).catch((exception) => {
                    logger.error(exception);
                    return Promise.reject();
                });
            }, Promise.resolve());
        }).then((result) => {
            resolve(settledPayments);
        }).catch((exception) => {
            logger.error(exception);
            reject(exception);
        });
    });
}


export function confirmPendingPayment(request) {

    let sender = web3.toAscii(request.sender).replace(/\u0000/g, '');
    let senderConfig = config.allNodes.filter((item) => item.ethKey == request.sender)[0];
    let receiverConfig = config.allNodes.filter((item) => item.ethKey == request.receiver)[0];
    let transId = web3.toAscii(request.pmtRef).replace(/\u0000/g, '');

    return new Promise((resolve, reject) => {
        confirmPayment(transId, senderConfig.constKey).then((confirmedPayment) => {
            resolve(true);
        }).catch((exception) => {
            logger.errorinfo(exception);
            reject(exception);
        })
    });
}

export function releaseSettledPayment(request) {

    let transId = request.pmtRef;

    return new Promise((resolve, reject) => {
        getActiveCounterparties().then((activeNodes) => {
            return releasePayment(transId, activeNodes);
        }).then((result) => {
            resolve(true);
        }).catch((exception) => {
            logger.error(exception);
            reject((500, exception));
        });

    });
}

export function pledgeFunds(request) {
    logger.info("Pledge transaction ");

    let salt = generateSalt();
    let transaction = new Transaction();
    transaction.transId = 'PL' + Date.now() + 1;
    transaction.receiver = request.receiver;
    transaction.transactionAmount = request.transactionAmount;

    return new Promise((resolve, reject) => {
        isBankSuspended(transaction.receiver).then((suspendStatus) => {
            if(suspendStatus){
                return Promise.reject(new Error(400, "bank is suspended"));
            }
            return pledge(transaction);
        }).then((pledgeResult) => {
            return queryBalanceByStash(transaction.receiver);
        }).then((balance) => {
            return setShieldedBalance(balance, transaction.receiver, salt);
        }).then((shieldedBalance) => {
            let participants = [];
            let receiverConfig = config.allNodes.filter((item) => item.stashName === transaction.receiver)[0];
            participants.push(receiverConfig.constKey);
            return setCurrentSalt(salt, participants, true);
        }).then((result) => {
            transaction.status = collection.PaymentStatus.ACTIVE;
            resolve(transaction);
        })
        .catch((exception) => {
            logger.error(`unable to pledge to bank ${transaction.receiver}: ${exception}`);
            reject(exception);
        })
    });
}

export function redeemFunds(request) {
    logger.info("Redeem transaction ");

    let salt = generateSalt();
    let transaction = new Transaction();
    transaction.transId = 'RD' + Date.now() + 1;
    transaction.sender = request.sender;
    transaction.transactionAmount = request.transactionAmount;

    return new Promise((resolve, reject) => {
        isBankSuspended( transaction.sender).then((suspendStatus) => {
            if(suspendStatus){
                return Promise.reject(new Error(400, "bank is suspended"));
            }
            return redeem(transaction);
        }).then((pledgeResult) => {
            return queryBalanceByStash(transaction.sender);
        }).then((balance) => {
            return setShieldedBalance(balance, transaction.sender, salt);
        }).then((shieldedBalance) => {
            let participants = [];
            let senderConfig = config.allNodes.filter((item) => item.stashName === transaction.sender)[0];
            participants.push(senderConfig.constKey);
            return setCurrentSalt(salt, participants, true);
        }).then((result) => {
            transaction.status = collection.PaymentStatus.ACTIVE;
            resolve(transaction);
        })
        .catch((exception) => {
            logger.error(exception);
            reject(exception);
        })
    });
}

function delay(t) {
    return new Promise(function (resolve) {
        setTimeout(resolve, t)
    });
}
