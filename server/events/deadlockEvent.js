import contracts from '../utils/contracts';
import {getLogger} from '../utils/logger';
import {setNettingStatus} from '../services/nettingService';
import * as collection from '../model/enum';

const logger = getLogger("DeadlockEvent");

let deadlock;

export function subscribeForDeadlock() {
  const paymentAgent = contracts.getContract('PaymentAgent');
  
  paymentAgent.deployed().then((instance) => {
    deadlock = instance.Deadlock({}, { fromBlock: 'latest', toBlock: 'latest' });
    deadlock.watch((error, response) => {
      logger.info("Deadlock detected!");
      setNettingStatus(collection.NettingStatus.DEADLOCK.value);
    });
  });
}

export function unsubscribeForDeadlock() {
  deadlock.stopWatching();
}
