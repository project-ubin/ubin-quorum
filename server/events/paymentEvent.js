import contracts from '../utils/contracts';
import config from '../utils/config';
import {getGridlockQueue} from '../adapter/queueAdapter';
import {getSaltandBalance} from '../adapter/networkAdapter';

import {getLogger} from '../utils/logger';

const logger = getLogger("PaymentEvent");

let paymentEvent;

export function subscribeForIncomingPayment() {
  const paymentAgent = contracts.getContract('PaymentAgent');
  paymentAgent.deployed().then((instance) => {
    paymentEvent = instance.Payment({ gridlocked: true }, { fromBlock: 'latest', toBlock: 'latest' });
    paymentEvent.watch((error, response) => {
      logger.info("subscribe for ProposalCompleted event");
      getSaltandBalance().then((balance) => {
        getGridlockQueue().then((gridlockItems) => {
          logger.debug(balance, gridlockItems);
        });
      });
    });
  });
}

export function unsubscribeForIncomingPayment() {
  paymentEvent.stopWatching();
}
