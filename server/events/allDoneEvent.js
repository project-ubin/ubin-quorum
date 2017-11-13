import contracts from '../utils/contracts';
import config from '../utils/config';
import {getLogger} from '../utils/logger';
import {initiatedoResolveRound, getResolveSequence} from '../adapter/nettingAdapter';

const logger = getLogger("AllDoneEvent");

let allDone;

export function subscribeForAllDone() {
	let paymentAgent = contracts.getContract('PaymentAgent');

	paymentAgent.deployed().then((instance) => {
		logger.info("subscribe for AllDone event");
		allDone = instance.AllDone({}, { fromBlock: 'latest', toBlock: 'latest' });
		allDone.watch((error, response) => {

			let current;
			let sequenceId;
			let sequenceLength;

			logger.debug(`AllDone received - Payload: ${JSON.stringify(response)}`);
			logger.debug(`AllDone received - Error Payload: ${JSON.stringify(error)} `);
			
			paymentAgent = instance;
			current = parseInt(response.args.current);
			logger.debug('AllDone - current: ' + current);
			paymentAgent.getMyResolveSequenceId.call().then((seqId) => {
				logger.info("AllDone - my sequence id: " + seqId);
				sequenceId = parseInt(seqId);
				return paymentAgent.getResolveSequenceLength();

			}).then((seqLen) => {
				logger.info("All Done - sequence length: " + seqLen);
				sequenceLength = parseInt(seqLen);
				return getResolveSequence(current);

			}).then((result) => {
				
				if (config.myConfig.ethKey == result) {
					logger.info("my turn");
					initiatedoResolveRound();
				}
				/*else {
					logger.info("not my turn");
					let timeout = (((sequenceId - current).mod(sequenceLength)) * config.appConfig.timeout) + 1000;
					logger.info("All done timeout: " + timeout);
					setTimeout(function () {
						initiatedoResolveRound();
					}, timeout);
				}*/
			});
			current = parseInt(response.args.current);
		})
	});
}

Number.prototype.mod = function (n) {
	return ((this % n) + n) % n;
}

export function unsubscribeForAllDone() {
	allDone.stopWatching();
}
