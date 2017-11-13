import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import Bank from '../model/bank';
import { saltInt, hashData } from '../utils/dataUtils';
import getLogger from '../utils/logger';
import request from 'request-promise';
import Error from '../model/error';

const logger = getLogger('NetworkAdapter');


export function getActiveCounterparties() {
    return new Promise((resolve, reject) => {
        logger.info(`querying active counterparties`);
        let activeNodes = web3.admin.peers.map(node => node.id);

        logger.debug("Active Nodes: " + activeNodes);
        let result = [];

        config.allNodes.forEach(function (element) {
            if (activeNodes.includes(element.enode)) {
                result.push(element.constKey);
            }
        }, this);
        resolve(result);
    });
}


export function setCurrentSalt(newSalt, nodes, regulator) {
    logger.info("setting current salt: " + newSalt);
    let paymentAgent;
    let regulatorConfig = config.allNodes.filter((item) => item.regulator)[0];
    let from;

    if (regulator) {
        paymentAgent = contracts.getContractWithNewProvider("PaymentAgent", regulatorConfig.host, regulatorConfig.port);
        from = regulatorConfig.ethKey;
    } else {
        from = config.myConfig.ethKey;
        paymentAgent = contracts.getContract('PaymentAgent');
    }

    newSalt = "0x" + newSalt;

    return new Promise((resolve, reject) => {

        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.setCurrentSalt(newSalt, {
                gas: config.appConfig.defaultGas,
                from: from,
                privateFor: nodes
            });
        }).then((saltStatus) => {
            logger.info('agent state = ' + saltStatus);
            resolve(saltStatus);
        })
            .catch((exception) => {
                logger.error("setting salt failure: " + exception);
                reject(new Error(300, "unable to set current salt"));
            });
    });
}

export function setNettingSalt(newSalt, nodes) {
    logger.info("setting netting salt: " + newSalt);
    let paymentAgent = contracts.getContract('PaymentAgent');

    newSalt = "0x" + newSalt;

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.setNettingSalt(newSalt, {
                gas: config.appConfig.defaultGas,
                from: config.myConfig.ethKey,
                privateFor: nodes
            });
        }).then((saltStatus) => {
            logger.info('agent state = ' + saltStatus);
            resolve(saltStatus);
        })
        .catch((exception) => {
            logger.error("setting salt failure: " + exception);
            reject(new Error(301, "unable to set netting salt"));
        });
    });
}


export function unsuspendBank(bic, counterparties) {

    let paymentAgent = contracts.getContract('PaymentAgent');
    logger.info(`unsuspend bank: ${bic}`);

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            paymentAgent.unSuspendStash(bic, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: counterparties
            }).then((unsuspendResponse) => {
                logger.debug(`bank ${bic} is unsuspended succesfully`);
                resolve(true);
            }).catch((exception) => {
                logger.error(`unable to unsuspend bank ${bic}: ${exception}`);
                reject(new Error(302, "unable to suspend bank"));
            });
        });
    })
}


export function suspendBank(bic, counterparties) {

    let paymentAgent = contracts.getContract('PaymentAgent');
    logger.info(`suspend bank: ${bic}`);

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            paymentAgent.suspendStash(bic, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: counterparties
            }).then((suspendResponse) => {
                logger.debug(`bank ${bic} is suspended succesfully`);
                resolve(true);
            }).catch((exception) => {
                logger.error(`unable to suspend bank ${bic}: ${exception}`);
                reject(new Error(303, "unable to suspend bank"));
            });
        })
    })
}

export function getSaltandBalance() {
    let paymentAgent = contracts.getContract('PaymentAgent');
    let balance;
    let salt;
    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getBalance.call(config.myConfig.stashName);

        }).then((currentBalance) => {
            balance = parseInt(currentBalance);
            return paymentAgent.currentSalt.call();
        }).then((currentSalt) => {
            salt = currentSalt.slice(2);
            resolve({
                salt: salt,
                balance: balance
            });
        }).catch((exception) => {
            logger.error(exception);
            reject(new Error(304, "unable to get salt and balance"));
        });
    });
}

export function getShieldedBalance() {

    let sgdZ = contracts.getContract('SGDz');
    let receiverConfig = config.allNodes.filter((item) => item.stashName == receiver)[0];

    return new Promise((resolve, reject) => {
        sgdZ.deployed().then((instance) => {
            return sgdZ.shieldedBalances.call(config.myConfig.ethKey);
        }).then((shieldedBalances) => {
            resolve(shieldedBalances);
        }).catch((exception) => {
            logger.error(exception);
            reject(new Error(305, "unable to get shielded balance"));
        });
    });
}


export function isBankSuspended(bic) {

    logger.info(`checking status of bank ${bic}`);

    let paymentAgent = contracts.getContract('PaymentAgent');

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.suspended.call(bic);
        }).then((result) => {
            logger.debug(`bank b suspended status: ${result}`);
            resolve(result);
        }).catch((exception) => {
            logger.error(`unable to check suspended status of bank ${bic}: ${exception}`);
            reject(new Error(306, "unable to check suspended status of bank"));
        })
    });
}


export function queryBalanceByStash(stashName) {

    logger.info(`querying balance for bank ${stashName}`);
    let bankConfig = config.allNodes.filter((item) => item.stashName === stashName)[0];

    let paymentAgent;

    return new Promise((resolve, reject) => {

        if (!config.myConfig.regulator && !config.myConfig.centralBank) {
            reject("Invalid node. Function is only for Regulator or Central Bank");
        }
        else{
            paymentAgent = contracts.getContractWithNewProvider('PaymentAgent', bankConfig.host, bankConfig.port)

            paymentAgent.deployed().then((instance) => {
                paymentAgent = instance;
                return paymentAgent.getBalance.call(stashName);
            }).then((balance) => {
                logger.debug(`Bank ${stashName} balance: ${balance}`);
                resolve(balance);
            }).catch((error) => {
                logger.error("Exception during balance query: " + error);
                reject(new Error(307, "unable to query balance by stash"));
            });
        }
    });
}    

export function setShieldedBalance(balance, receiver, salt) {

    logger.info(`set shielded balance for bank ${receiver}`);
    let regulatorConfig = config.allNodes.filter((item) => item.regulator)[0];
    let bankConfig = config.allNodes.filter((item) => item.stashName === receiver)[0];

    let sgdZ;

    return new Promise((resolve, reject) => {

        if (!config.myConfig.regulator && !config.myConfig.centralBank) {
            reject(new Error(103, "Invalid node. Function is only for Regulator or Central Bank"));
        } 
        else {
            sgdZ = contracts.getContractWithNewProvider("SGDz", regulatorConfig.host, regulatorConfig.port);

            sgdZ.deployed().then((instance) => {
                sgdZ = instance;
                logger.info("set-shielded-balance");
                let amountHex = saltInt(balance, salt);
                let amountHash = hashData(amountHex);

                return sgdZ.setShieldedBalance(bankConfig.ethKey, amountHash, {
                    from: regulatorConfig.ethKey,
                    gas: config.appConfig.defaultGas
                });

            }).then((shieldedBalance) => {
                logger.debug(`Bank ${receiver} balance: ${balance}`);
                resolve(balance);
            }).catch((error) => {
                logger.error("Exception during set shielded balance: " + error);
                reject(new Error(308, "unable to set shielded balance"));
            });
        }
    });

}


export function getBalanceandPosition() {

    let position;
    let balance;
    let paymentAgent = contracts.getContract('PaymentAgent');
    logger.info(`get balance and position for bank ${config.myConfig.stashName}`);

    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getBalance.call(config.myConfig.stashName);
        }).then((bal) => {
            logger.debug(`bank ${config.myConfig.stashName} balance: ${bal}`);
            balance = bal;
            return paymentAgent.getPosition.call(config.myConfig.stashName);
        }).then((pos) => {
            logger.debug(`bank ${config.myConfig.stashName} position: ${pos}`);
            position = pos;
            resolve({
                position: position,
                balance: balance
            })
        }).catch((error) => {
            logger.error("Exception during balance query: " + error);
            reject(new Error(309, "unable to get balance and position"));
        });
    });

}

export function getStashes() {
    logger.info(`query stashes from node`);


    return new Promise((resolve) => {
        let paymentAgent = contracts.getContract('PaymentAgent');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getStashNames.call()
        }).then((names) => {
            let stashes = names;
            let getStashesPromises = [];

            for (let i = 0; i < stashes.length; i++) {
                getStashesPromises.push(new Promise((resolve) => {
                    let bank = new Bank();
                    paymentAgent.stashNames.call(i)
                        .then((stashName) => {
                            bank.bic = web3.toAscii(stashName).replace(/\u0000/g, '');
                            return paymentAgent.getBalance.call(stashName).then((bal) => {
                                bank.balance = bal;
                                return paymentAgent.getPosition.call(stashName);
                            });
                        })
                        .then((pos) => {
                            bank.position = pos;
                            resolve(bank);
                        });
                }));
            }

            Promise.all(getStashesPromises).then((result) => {
                resolve(result);
            });
        });
    });
}

export function getAgentState() {
    logger.info("Querying agent state");
    let paymentAgent = contracts.getContract('PaymentAgent');
    return new Promise((resolve, reject) => {
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return paymentAgent.getAgentState.call();
        }).then((agtStatus) => {
            logger.debug(`agent state = ${agtStatus}`);
            resolve(agtStatus);
        }).catch((exception) => {
            console.log("Exception during balance query: " + exception);
            reject(new Error(310, "unable to query agent state"));
        })
    });
}

export function createProof(hash1, hash2, hash3, hex1, hex2, hex3){
    
    logger.info("creating proof");

    let id = Date.now();

    return new Promise((resolve, reject) => {
        
        let options = {
            method: 'POST',
            uri: "http://" + config.myConfig.host +":" +config.myConfig.port,
            body: {
                jsonrpc : "2.0",
                method : "zsl_createABCProof",
                params : [hash1, hash2, hash3, hex1, hex2, hex3],
                id : 1
            },
            json: true 
        }

        logger.debug(`proof-creation payload: ${JSON.stringify(options)}`);
        
        request(options)
            .then((response) => {
                logger.debug(`proof created: ${JSON.stringify(response)}`);
                resolve(response.result.proof);
            })
            .catch((exception) =>{
                logger.error(`unable to create proof: ${exception}`);
                reject(new error(311, "unable to create proof"));
            });
    });
}