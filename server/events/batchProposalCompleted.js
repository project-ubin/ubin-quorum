import contracts from '../utils/contracts';
import config from '../utils/config';
import { handleSettle, getResolveSequence } from '../adapter/nettingAdapter';
import { setNettingStatus } from '../services/nettingService';
import * as collection from '../model/enum';
import { getLogger } from '../utils/logger';
const logger = getLogger("BatchProposal");

let batchedCompleted;

export function subscribeForBatchedCompleted() {
  const sgdZ = contracts.getContract('SGDz');

  sgdZ.deployed().then((instance) => {
    logger.info("subscribe for BatchProposalCompleted event");
    batchedCompleted = instance.BatchedProposalCompleted({}, { fromBlock: 'latest', toBlock: 'latest' });
    batchedCompleted.watch((error, response) => {
      logger.debug(`BatchProposalCompleted received - Payload: ${JSON.stringify(response)}`);
      logger.debug(`BatchProposalCompleted received - Error Payload: ${JSON.stringify(error)} `);
      setNettingStatus(collection.NettingStatus.COMPLETE.value);
      getResolveSequence(0).then((result) => {
      
        if (config.myConfig.ethKey == result) {
          logger.info("BatchProposalCompleted - i am the leader");
          handleSettle();
        }
      });
    });
  });
}


export function unsubscribeForBatchedCompleted() {
  batchedCompleted.stopWatching();
}
