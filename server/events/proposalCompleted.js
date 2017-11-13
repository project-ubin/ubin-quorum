import contracts from '../utils/contracts';
import config from '../utils/config';
import { verifyShieldPayment, confirmPendingPayment, releaseSettledPayment } from '../services/fundService';
import { getLogger } from '../utils/logger';

const logger = getLogger("ProposalCompleted");

let proposalCompleted;

export function subscribeForProposalCompleted() {
    const sgdZ = contracts.getContract('SGDz');
    let stashName = config.myConfig.ethKey;

    sgdZ.deployed().then((instance) => {
        proposalCompleted = instance.ProposalCompleted({ receiver: stashName }, { fromBlock: 'latest', toBlock: 'latest' });
        logger.info("subscribe for ProposalCompleted event");
        proposalCompleted.watch((error, response) => {

            logger.debug(`ProposalCompleted received - Payload: ${JSON.stringify(response)}`);
            logger.debug(`ProposalCompleted received - Error Payload: ${JSON.stringify(error)} `);

            if (response.args.receiver == config.myConfig.ethKey) {
                logger.info("ProposalCompleted - Found receiver");
                confirmPendingPayment(response.args).then((result) => {
                    logger.info("ProposalCompleted - Payment is confirmed");
                    releaseSettledPayment(response.args);
                });
            }
        });

    });
}

export function unsubscribeForProposalCompleted() {
    proposalCompleted.stopWatching();
}
