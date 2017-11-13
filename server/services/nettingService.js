
import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import DataUtil from '../utils/dataUtils';
import Bank from '../model/bank';
import { getAgentState } from '../adapter/networkAdapter';
import * as collection from '../model/enum';
import getLogger from '../utils/logger';

let nettingStatus = 0;
const logger = getLogger('NettingService');

export function initializeNettingStatus(){
    getAgentState().then((result) => {
        nettingStatus = parseInt(result);
    });
}

export function getNettingStatus() {
    logger.info("getting netting status from memory ");
    return new Promise((resolve , reject) => {
        resolve({
            status:  collection.NettingStatus.get(nettingStatus)
        });
    });

}

export function setNettingStatus(status) {
    logger.info(`setting netting status to ${status}`);
    nettingStatus = parseInt(status);
}
