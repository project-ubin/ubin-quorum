import contracts from '../utils/contracts';
import config from '../utils/config';
import {verifyShieldPayment, confirmPendingPayment, releaseSettledPayment} from '../services/fundService';
import {getLogger} from '../utils/logger';

const logger = getLogger("AmountHash");

let amountHash;

export function subscribeForAmountHash(){
  const sgdZ = contracts.getContract('SGDz');
  let stashName = config.myConfig.ethKey;

  let proposalCompleted;
  let proposalInitiated;

  sgdZ.deployed().then((instance) => {
    logger.info("subscribe for AmountHash event");
    amountHash = instance.AmountHash({ receiver: stashName }, { fromBlock: 'latest', toBlock: 'latest' });    
    amountHash.watch((error, response) => {

        logger.debug(`AmountHash received - Payload: ${JSON.stringify(response)}`);
        logger.debug(`AmountHash received - Error Payload: ${JSON.stringify(error)} `);

        if(response.args.receiver == config.myConfig.ethKey){
            logger.info(`AmountHash - Found receiver`);
            verifyShieldPayment(response.args);
        }
    });

  });
}

export function unsubscribeForAmountHash() {
    amountHash.stopWatching();
}
