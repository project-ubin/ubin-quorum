import contracts from '../utils/contracts';
import config from '../utils/config';
import { verifyShieldPayment} from '../services/fundService';
import { getLogger } from '../utils/logger';
const logger = getLogger("ProposalInitiated");

let proposalInitiated;

export function subscribeForProposalInitiated() {
    const sgdZ = contracts.getContract('SGDz');
    let stashName = config.myConfig.ethKey;

    sgdZ.deployed().then((instance) => {
        proposalInitiated = instance.ProposalInitiated({ receiver: stashName }, { fromBlock: 'latest', toBlock: 'latest' });
        logger.info("subscribe for ProposalInitiated event");
        proposalInitiated.watch((error, response) => {
            logger.debug(`ProposalInitiated received - Payload: ${JSON.stringify(response)}`);
            logger.debug(`ProposalInitiated received - Error Payload: ${JSON.stringify(error)} `);

            if (response.args.receiver == config.myConfig.ethKey) {
                logger.info("ProposalInitiated - Found receiver");
                verifyShieldPayment(response.args);
            }

        });
    });
}

export function unsubscribeForProposalInitiated() {
    proposalInitiated.stopWatching();
}
