import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import { formatDate, saltInt, hashData } from '../utils/dataUtils';
import config from '../utils/config';
import Transaction from '../model/transaction';
import { getLogger } from '../utils/logger';
import { getActiveCounterparties, createProof, setNettingSalt } from '../adapter/networkAdapter';
import Promise from 'bluebird';

const logger = getLogger("NettingAdapter");


export function getResolveSequence(current) {
    return new Promise((resolve, reject) => {
        logger.info("getResolveSequence called!");
        let paymentAgent = contracts.getContract("PaymentAgent");
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return getActiveCounterparties();
        }).then((activeNodes) => {
            return paymentAgent.resolveSequence.call(current, {
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: activeNodes
            })
        }).then((result) => {
            logger.debug(`Sequence #${current}: ${result}`);
            resolve(result);
        });
    });
}

export function initiateLineUp() {
    return new Promise((resolve, reject) => {
        logger.info('initiateLineUp called!');
        let paymentAgent = contracts.getContract('PaymentAgent');
        let sgdZ = contracts.getContract('SGDz');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;
            return getActiveCounterparties();
        }).then((activeNodes) => {

            return paymentAgent.lineUp({
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: activeNodes
            });
        }).then((result) => {
            logger.info("initiateLineUp response :" + JSON.stringify(result));
            resolve();

        }).catch((exception) => {
            logger.info("Error during initiateLineUp: " + exception);
            reject({
                error: "Unable to invoke lineUp: " + exception
            });
        });
    });
}

export function initiatedoResolveRound() {
    return new Promise((resolve, reject) => {
        logger.info('Initiate Resolve Round!');
        let allConfig;
        let paymentAgent = contracts.getContract('PaymentAgent');
        paymentAgent.deployed().then((instance) => {
            paymentAgent = instance;

            return paymentAgent.current.call();
        }).then((currentNodeIdx) => {
            logger.info('currentNodeIdx: ' + currentNodeIdx);
            return getActiveCounterparties()
        }).then((activeNodes) => {
            allConfig = activeNodes;
            logger.info("active node: " + JSON.stringify(allConfig));;
            return paymentAgent.ping({
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: allConfig
            });
        }).then((result) => {
            logger.info('ping time: ' + JSON.stringify(result.logs));

            return paymentAgent.getResolveSequence.call();
        }).then((result) => {
            logger.info("Resolve Sequence: " + JSON.stringify(result));
            return paymentAgent.lastResolveTime.call();
        }).then((result) => {
            logger.info("last resolve time " + result);

            return paymentAgent.doResolveRound({
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas,
                privateFor: allConfig
            });
        }).then((result) => {

            logger.info("\tmined!, block: " + result.receipt.blockNumber);
            //logger.info("DoResolveRound: " + JSON.stringify(result));


            if (result.logs.length == 0) {
                logger.info("No Sync event emitted --> last one to resolve");
                resolve();
                return;
            }

            let syncEvent = result.logs.filter((i) => i.event == "Sync")[0].args;

            logger.info('[Sync] event: ' + JSON.stringify(result.logs))

            let inactivatedPmtRefs = syncEvent.inactivatedPmtRefs;
            let doneStashes = syncEvent.doneStashes;
            let notDoneStashes = syncEvent.notDoneStashes;

            logger.info("Syncing pseudo-public states...");
            paymentAgent.syncPseudoPublicStates(inactivatedPmtRefs, doneStashes, notDoneStashes,
                {
                    from: config.myConfig.ethKey,
                    gas: config.appConfig.defaultGas,
                    privateFor: allConfig
                })
                .then((result) => {
                    logger.info('[AllDone] event:' + JSON.stringify(result.logs));
                    resolve();
                });

        }).catch((exception) => {
            logger.info("Error during initiatedoResolveRound: " + exception);
            reject({
                error: "Unable to invoke initiatedoResolveRound: " + exception
            });
        });
    });
}

export function submitNettingProof() {
    let activeCount = 0;
    let paymentAgent = contracts.getContract('PaymentAgent');
    let SGDz = contracts.getContract("SGDz");
    let nettingOuts = [];
    let nettingIns = [];
    let status;
    let currentSalt;
    let salt;
    let hasIncomings;
    let lastSalt;

    paymentAgent.deployed().then((instance) => {
        paymentAgent = instance;
        return SGDz.deployed();
    }).then((instance) => {
        SGDz = instance;
        return paymentAgent.currentSalt.call();
    }).then((result) => {
        currentSalt = result.slice(2);
        return paymentAgent.getGridlockQueueDepth.call();
    }).then((depth) => {
        logger.info('depth: ' + depth);
        return promiseFor((count) => { return count < depth; }, (count) => {
            logger.info('count: ' + count);
            return paymentAgent.gridlockQueue.call(count).then((pmtRef) => {
                logger.info('pmtRef: ' + pmtRef);
                return paymentAgent.globalGridlockQueue.call(pmtRef).then((g_pmt) => {
                    logger.info('g_pmt: ' + JSON.stringify(g_pmt));
                    if (g_pmt[0] == 2) status = 'Active';
                    else if (g_pmt[0] == 1) status = 'Inactive';
                    else if (g_pmt[0] == 3) status = 'OnHold';
                    else if (g_pmt[0] == 0) status = 'Cancelled';
                    else status = g_pmt[0];

                    return paymentAgent.payments.call(pmtRef).then((pmt) => {
                        let sender = web3.toAscii(pmt[1]).replace(/\u0000/g, '');
                        logger.info('sender: ' + sender)
                        logger.info('stashName: ' + config.myConfig.stashName)
                        logger.info(String(config.myConfig.stashName) === String(sender))

                        salt = pmt[8];

                        if (status == 'Active') {
                            logger.info("G-Payment: " + JSON.stringify(g_pmt));
                            activeCount++;
                            if (config.myConfig.stashName === sender) {
                                nettingOuts.push(
                                    { 'pmtRef': pmtRef, 'amount': parseInt(pmt[3]), 'salt': salt });
                            } else {
                                nettingIns.push(
                                    { 'pmtRef': pmtRef, 'amount': parseInt(pmt[3]), 'salt': salt });
                            }
                            logger.info(nettingIns);
                            logger.info(nettingOuts)
                        }
                        return ++count;
                    });
                });
            });
        }, 0);


    }).then((result) => {
        logger.info('promiseFor ends :' + result);
        logger.info("activeCount: " + activeCount);
        if (activeCount == 0) {
            SGDz.batchedProofFinished({
                from: config.myConfig.ethKey,
                gas: config.appConfig.defaultGas
            })
                .then((result) => {
                    logger.info("\tmined!, block: " + result.receipt.blockNumber);
                    logger.info(JSON.stringify(result.logs));
                    logger.info("");
                });
        } else {
            return paymentAgent.getBalance.call(config.myConfig.stashName);
        }

    }).then((result) => {
        logger.info('stash balance: ' + result)
        let last_in;
        if (nettingIns.length > 0) {
            nettingIns[0].startBal = parseInt(result);

            // gathering infos for batch proof
            for (var i = 0; i < nettingIns.length - 1; i++) {
                nettingIns[i].endBal = nettingIns[i].startBal + nettingIns[i].amount;
                nettingIns[i + 1].startBal = nettingIns[i].endBal;
            }
            last_in = nettingIns.length - 1;
            nettingIns[last_in].endBal = nettingIns[last_in].startBal + nettingIns[last_in].amount;
        }

        if (nettingOuts.length > 0) {

            if (nettingIns.length > 0) {
                nettingOuts[0].startBal = nettingIns[last_in].endBal;
            }
            else {
                nettingOuts[0].startBal = parseInt(result);
            }
            for (var j = 0; j < nettingOuts.length - 1; j++) {
                nettingOuts[j].endBal = nettingOuts[j].startBal - nettingOuts[j].amount;
                nettingOuts[j + 1].startBal = nettingOuts[j].endBal;
            }
            let last_out = nettingOuts.length - 1;
            nettingOuts[last_out].endBal = nettingOuts[last_out].startBal - nettingOuts[last_out].amount;
        }
        logger.info('nettingIns: ' + JSON.stringify(nettingIns));
        logger.info('nettingOuts: ' + JSON.stringify(nettingOuts));

        hasIncomings = nettingIns.length > 0;

        return promiseFor((count) => {
            return count < nettingIns.length;
        }, (count) => {
            let r1hex = saltInt(nettingIns[count].startBal, nettingIns[count].salt.slice(2));
            let r2hex = saltInt(nettingIns[count].amount, nettingIns[count].salt.slice(2));
            let r3hex = saltInt(nettingIns[count].endBal, nettingIns[count].salt.slice(2));
            let h1 = hashData(r1hex);
            let h2 = hashData(r2hex);
            let h3 = hashData(r3hex);

            if (count == 0) {
                r1hex = saltInt(nettingIns[count].startBal, currentSalt);
                h1 = hashData(r1hex);
            }
            else {
                r1hex = saltInt(nettingIns[count].startBal, nettingIns[count - 1].salt.slice(2));
                h1 = hashData(r1hex);
            }

            nettingIns[count].startBalHash = h1;
            nettingIns[count].endBalHash = h3

            lastSalt = nettingIns[count].salt.slice(2);

            return createProof(h1, h2, h3, r1hex, r2hex, r3hex).then((proof) => {
                logger.info(proof);
                nettingIns[count].proof = proof;

                logger.info('**submitting incoming proposal #' + count + ' **');

                return SGDz.submitProposal(
                    nettingIns[count].proof,
                    nettingIns[count].pmtRef,
                    nettingIns[count].startBalHash,
                    nettingIns[count].endBalHash,
                    true,
                    {
                        from: config.myConfig.ethKey,
                        gas: config.appConfig.defaultGas
                    }
                ).then((result) => {
                    logger.info("\tmined!, block: " + result.receipt.blockNumber);
                    logger.info(JSON.stringify(result.logs));
                    logger.info("");

                    return ++count;
                });
            });

        }, 0);

    }).then((result) => {
        logger.info(result);

        return promiseFor((count) => {
            return count < nettingOuts.length;
        }, (count) => {
            let r1hex = saltInt(nettingOuts[count].endBal, nettingOuts[count].salt.slice(2)),
                r2hex = saltInt(nettingOuts[count].amount, nettingOuts[count].salt.slice(2)),
                r3hex = saltInt(nettingOuts[count].startBal, nettingOuts[count].salt.slice(2)),
                h1 = hashData(r1hex),
                h2 = hashData(r2hex),
                h3 = hashData(r3hex);

            if (count == 0) {
                if (!hasIncomings) {
                    r3hex = saltInt(nettingOuts[count].startBal, currentSalt);
                }
                else {
                    r3hex = saltInt(nettingOuts[count].startBal, nettingIns[nettingIns.length - 1].salt.slice(2));
                }
                h3 = hashData(r3hex);
            }
            else {
                r3hex = saltInt(nettingOuts[count].startBal, nettingOuts[count - 1].salt.slice(2));
                h3 = hashData(r3hex);
            }
            nettingOuts[count].endBalHash = h1;
            nettingOuts[count].startBalHash = h3;
            lastSalt = nettingOuts[count].salt.slice(2);
            return createProof(h1, h2, h3, r1hex, r2hex, r3hex).then((proof) => {
                logger.info(proof);
                nettingOuts[count].proof = proof;


                logger.info('**submitting outgoing proposal #' + count + ' **');

                return SGDz.submitProposal(
                    nettingOuts[count].proof,
                    nettingOuts[count].pmtRef,
                    nettingOuts[count].startBalHash,
                    nettingOuts[count].endBalHash,
                    true,
                    {
                        from: config.myConfig.ethKey,
                        gas: config.appConfig.defaultGas
                    }
                ).then((result) => {
                    logger.info("\tmined!, block: " + result.receipt.blockNumber);
                    logger.info(JSON.stringify(result.logs));
                    logger.info("");

                    return ++count;
                });
            });

        }, 0);

    }).then((result) => {
        return getActiveCounterparties()
    }).then((activeNodes) => {
        return setNettingSalt(lastSalt, activeNodes);
    }).then((result) => {
        logger.info(result);

        return SGDz.batchedProofFinished({
            from: config.myConfig.ethKey,
            gas: config.appConfig.defaultGas
        });
    }).then((result) => {
        logger.info("\tmined!, block: " + result.receipt.blockNumber);
        logger.info(JSON.stringify(result.logs));
        logger.info("");

        return SGDz.done.call(config.myConfig.ethKey);
    }).then((done) => {
        if (!done) { //
            logger.debug('something wrong... maybe 2nd LSM?');
            return promiseFor((count) => {
                return count < 3; // retry 3 times
            }, (count) => {
                logger.debug('retry #' + count);

                return delay(10000).then(() => { // 10 sec
                    return SGDz.batchedProofFinished({
                        from: config.myConfig.ethKey,
                        gas: config.appConfig.defaultGas
                    });
                }).then((result) => {
                    logger.info("\tmined!, block: " + result.receipt.blockNumber);
                    logger.info(JSON.stringify(result.logs));
                    logger.info("");

                    return SGDz.getParticipants({
                        from: config.myConfig.ethKey,
                        gas: config.appConfig.defaultGas
                    });
                }).then((result) => {
                    logger.debug('# participants: ' + result.length);
                    if (result.length == 0) { // netting is done already, break the loop
                        return count + 3;
                    } else {
                        return ++count;
                    }
                });

            }, 0);

        } else {
            return false;
        }

    }).then((result) => {

        logger.debug(JSON.stringify(result));

    }).catch((e) => {
        logger.info(e);
    });
}

export function handleSettle() {

    let paymentAgent = contracts.getContract('PaymentAgent');
    let allConfig;
    logger.info("Settling Payment");
    paymentAgent.deployed().then((instance) => {
        paymentAgent = instance;
        return getActiveCounterparties();
    }).then((result) => {
        allConfig = result;
        return paymentAgent.settle({
            from: config.myConfig.ethKey,
            gas: config.appConfig.defaultGas,
            privateFor: allConfig
        });
    }).then((result) => {
        logger.info("\tmined!, block: " + result.receipt.blockNumber);
        logger.info("logs: " + JSON.stringify(result.logs));
        logger.info("");
    }).catch((err) => {
        logger.info(err.message);
    });
}

let promiseFor = Promise.method(function (condition, action, value) {
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
});