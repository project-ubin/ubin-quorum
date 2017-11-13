import config from '../utils/config';
import Transaction from '../model/transaction';
import Error from '../model/error';
import Bank from '../model/bank';
import Promise from 'bluebird';
import getLogger from '../utils/logger';
import * as collection from '../model/enum';
import { queryBalanceByStash, getStashes, isBankSuspended, getActiveCounterparties, suspendBank, unsuspendBank,getSaltandBalance, setCurrentSalt, getBalanceandPosition } from '../adapter/networkAdapter';
import { getPaymentHistory, getRedeemHistory, getPledgeHistory } from '../adapter/paymentAdapter';


const logger = getLogger('bankService');

export function getBankInfo() {

    logger.info(`querying balance for bank: ${config.myConfig.stashName}`);

    let bank = new Bank();

    return new Promise((resolve, reject) => {
        getBalanceandPosition().then((result) => {
            bank.bic = config.myConfig.stashName;
            bank.position = result.position;
            bank.balance = result.balance;
            resolve(bank);
        }).catch((exception) => {
            reject(exception);
        });
    });
}

export function getTransactionHistory(request) {
    let transactions = [];

    return new Promise((resolve) => {
        let filter = request;
        if (filter == null || filter == undefined) {
            filter = "ALL";
        }
        filter = filter.toUpperCase();
        
        switch (filter) {
            case "ALL":
                logger.info("Querying all transaction history");
                getPaymentHistory()
                    .then((result) => {
                        transactions = result;
                        return getPledgeHistory();
                    })
                    .then((result) => {
                        transactions = transactions.concat(result);
                        return getRedeemHistory();
                    })
                    .then((result) => {
                        transactions = transactions.concat(result);
                        resolve(transactions);
                    })
                    .catch((exception) => {
                        logger.error("Exception during get all transaction: " + JSON.stringify(exception));
                        reject(exception);
                    });
                break;
            case "TRANSFER":
                getPaymentHistory()
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((exception) => {
                        logger.error("Exception during get transfer: " + JSON.stringify(exception));
                        reject(exception);
                    })
                break;
            case "PLEDGE":
                getPledgeHistory()
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((exception) => {
                        logger.error("Exception during get pledge: " + JSON.stringify(exception));
                        reject(exception);
                    })
                break;
            case "REDEEM":
                getRedeemHistory()
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((exception) => {
                        logger.error("Exception during get redeem: " + JSON.stringify(exception));
                        reject(exception);
                    })
                break;
            default:
                logger.error("Error: input is invalid");
                reject(exception);
        }
    });
}

export function processUnsuspendBank(request) {

    let bank = new Bank();
    bank.bic = request.bic;

    return new Promise((resolve, reject) => {
        getActiveCounterparties().then((activeNodes) => {
            unsuspendBank(request.bic, activeNodes).then((result) => {
                bank.status = collection.BankStatus.ACTIVE;
                resolve(bank);
            });
        }).catch((exception) => {
            logger.error(`exception during unsuspend bank: ${exception}`);
            reject(exception);
        });
    });
}

export function processSuspendBank(request) {

    let bank = new Bank();
    bank.bic = request.bic;

    return new Promise((resolve, reject) => {
        getActiveCounterparties().then((activeNodes) => {
            suspendBank(request.bic, activeNodes).then((result) => {
                bank.status = collection.BankStatus.SUSPENDED;
                resolve(bank);
            });
        }).catch((exception) => {
            logger.error(`exception during suspend bank: ${exception}`);
            reject(exception);
        });
    });
}

export function queryBankBalances() {
    logger.info("querying balance for bank");

    let bankPromises = [];
    return new Promise((resolve, reject) => {
        for (let i = 0; i < config.allNodes.length; i++) {
            bankPromises.push(new Promise((resolve, reject) => {
                let bank = new Bank();
                logger.debug(config.allNodes.length);
                queryBalanceByStash(config.allNodes[i].stashName).then((bal) => {
                    bank.bic = config.allNodes[i].stashName;
                    bank.balance = bal;
                    resolve(bank);
                }).catch((exception) => {
                    resolve(bank);
                    logger.error(`unable to query balance for bank ${config.allNodes[i].stashName}`);
                });
            }));
        }

        Promise.all(bankPromises).then((result) => {
            let bankResult = result.filter((bank) => bank.bic != null);
            resolve(bankResult);
        }).catch((exception) => {
            reject(exception);
        });
    });
}

export function getCounterparties(request) {
    logger.info("Getting banks");

    let banks = [];

    return new Promise((resolve, reject) => {
        getStashes().then((stashes) => {
            return promiseFor((count) => {
                return count < stashes.length;
            }, (count) => {
                return isBankSuspended(stashes[count].bic).then((suspended) => {
                    if (!suspended && stashes[count].bic !== config.myConfig.stashName)
                        banks.push({ bic: stashes[count].bic });
                    return ++count;
                }).catch((exception) => {
                    logger.error("Exception during getContractWithNewProvider: " + exception);
                    reject(exception);
                });
            }, 0)
            .then((result) => {
                logger.debug('promiseFor ends :' + result);
                resolve(banks);
            });
        });
    });
}


export function getSalt(){
    return getSaltandBalance();
}

export function setSalt(request){
    return new Promise((resolve, reject) => {
        getActiveCounterparties().then((activeNodes) => {
            return setCurrentSalt(request.salt, activeNodes, false);
        }).then((response) => {
            resolve({response: true});
        });
    });
}

let promiseFor = Promise.method(function (condition, action, value) {
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
});

