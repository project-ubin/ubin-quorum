import contracts from '../utils/contracts';
import { initiateLineUp, getResolveSequence, initiatedoResolveRound } from '../adapter/nettingAdapter';
import { submitNettingProof, handleSettle } from '../adapter/nettingAdapter';
import {  } from '../services/fundService';
import {setNettingStatus} from '../services/nettingService';
import config from '../utils/config';
import {getLogger} from '../utils/logger';
import * as collection from '../model/enum';

const logger = getLogger("AgentStateChange");

let agentStateChangeEvent;
let leader = false;
let lineUpComplete = false;
let currentQueueDepth = 0;

export function subscribeForAgentStateChange() {
	let paymentAgent = contracts.getContract('PaymentAgent');
	let sgdZ = contracts.getContract('SGDz');

	paymentAgent.deployed().then((instance) => {
		paymentAgent = instance;
		agentStateChangeEvent = instance.AgentStateChange({}, { fromBlock: 'latest', toBlock: 'latest' });
		agentStateChangeEvent.watch((error, response) => {

			logger.debug(`AgentStateChange received - Payload: ${JSON.stringify(response)}`);
			logger.debug(`AgentStateChange received - Error Payload: ${JSON.stringify(error)} `);
			let agentState = parseInt(response.args.state);
			logger.info('AgentState: ' + agentState);
			let timeout = config.appConfig.timeout;
			
			if (agentState == collection.NettingStatus.LINEOPEN.value) {
				setNettingStatus(agentState);
				let lineUpComplete = false;
				leader = false;
				logger.debug(`Current State: LINEOPEN`);
				paymentAgent.getGridlockQueueDepth.call().then((queueDepth) => {
					if (queueDepth > 0) {
						initiateLineUp().then((result) => {
							logger.info("Initiate LINEUP completed");
							getResolveSequence(0).then((result) => {
								if (config.myConfig.ethKey == result) {
									logger.info("AgentStateChange - I am the leader");
									leader = true;
									setTimeout(function () {
										logger.info("Timeout reach - lineup status: " + lineUpComplete);
										if (!lineUpComplete) {
											lineUpComplete = true;
											initiatedoResolveRound();
										}
									}, timeout);
								}
							});
						});
					}
				});
			}
			else if (agentState == collection.NettingStatus.RESOLVING.value) {
				setNettingStatus(agentState);
				logger.debug(`Current State: RESOLVING`);

				/*paymentAgent.getMyResolveSequenceId.call().then((sequenceId) => {
					logger.info("MyResolve SequenceID: " + sequenceId);
					let baseTimeout = config.appConfig.timeout;
					let timeout = baseTimeout * parseInt(sequenceId);

					setTimeout(function () {
						initiatedoResolveRound();
					}, timeout);

				}); */
				getResolveSequence(0).then((result) => {

					logger.info("RESOLVING - lineup status: " + lineUpComplete);
					if (config.myConfig.ethKey == result) {
						if(leader && !lineUpComplete){	
							lineUpComplete = true;
							initiatedoResolveRound();
						}
					}
				});
			}
			else if (agentState == collection.NettingStatus.SETTLING.value) {
				setNettingStatus(agentState);
				let threshold = 0;
				let gridlockQueueDepth = 0;
				paymentAgent.getThreshold.call().then((thresholdCount) => {
					threshold = parseInt(thresholdCount);
					return paymentAgent.getGlobalGridlockQueueDepth();
				}).then((queueDepth) => {
					gridlockQueueDepth = parseInt(queueDepth);
					logger.info("Gridlock Queue Depth: " + gridlockQueueDepth);
					logger.info("Queue Threshold: " + threshold);
					
					if (gridlockQueueDepth >= threshold) {
						logger.info("Deadlock detected");
						return handleSettle();
					}
					else {
						paymentAgent.getActiveGridlockCount.call().then((count) => {
							logger.info("Active Count:" + count);
							if(parseInt(count) > 0) {
								sgdZ = contracts.getContract("SGDz");
								sgdZ.deployed().then((instance) => {
									sgdZ = instance;
									return sgdZ.lineUp({
										from: config.myConfig.ethKey,
										gas: config.appConfig.defaultGas
									});
								}).then((result) => {
									logger.info("\tmined!, block: " + result.receipt.blockNumber);
									logger.info("");
									submitNettingProof();
								})
							}
						});
					}
				});
			}
		});
	});
}

export function unsubscribeForAgentStateChange() {
	agentStateChangeEvent.stopWatching();
}
