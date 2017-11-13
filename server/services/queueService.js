import contracts from '../utils/contracts';
import web3 from '../utils/web3';
import config from '../utils/config';
import Transaction from '../model/transaction';
import Error from '../model/error';
import DataUtils from '../utils/dataUtils'
import { getGridlockQueue, cancelPayment, holdPayment, unholdPayment, getHoldGridlockQueue, updatePriority } from '../adapter/queueAdapter';
import { getLogger } from '../utils/logger';
import { getPaymentDetails } from '../adapter/paymentAdapter';
import { getActiveCounterparties, isBankSuspended } from '../adapter/networkAdapter';

import * as collection from '../model/enum';

const logger = getLogger("QueueService");

export function getOutgoingQueue() {
    logger.info("Query outgoing payment in the queue");
    let result = [];
    let outgoingPayments = [];
    return new Promise((resolve, reject) => {
        getGridlockQueue().then((result) => {
            let pendingPayments = result.filter((payment) => payment.sender == config.myConfig.stashName);
            // to update hold payment to get from nodes
            let holdPayment = [];
            outgoingPayments = outgoingPayments.concat(pendingPayments);
            logger.debug(`outgoing payments: ${JSON.stringify(outgoingPayments)}`);
            return getHoldGridlockQueue();
        }).then((holdPayments) => {
            outgoingPayments = outgoingPayments.concat(holdPayments);
            resolve(outgoingPayments);
        }).catch((exception) => {
            logger.error(`exception during get outgoing payments: ${exception}`);
            reject(exception);
        });
    });
}

export function getIncomingQueue() {
    logger.info("Query incoming payment in the queue");
    let result = [];
    let incomingPayments = [];
    return new Promise((resolve, reject) => {
        getGridlockQueue().then((result) => {
            let pendingPayments = result.filter((payment) => payment.receiver == config.myConfig.stashName);
            // to update hold payment to get from nodes
            incomingPayments = incomingPayments.concat(pendingPayments);
            logger.debug(`incoming payments: ${JSON.stringify(incomingPayments)}`);
            return getHoldGridlockQueue();
        }).then((holdPayments) => {
            incomingPayments = incomingPayments.concat(holdPayments);
            resolve(incomingPayments);
        }).catch((exception) => {
            logger.error(`exception during get incoming payments: ${exception}`);
            reject(exception);
        });
    });
}

export function getQueue() {
    logger.info("Query all payment in the queue");
    let result = [];
    let allPayments = [];
    return new Promise((resolve, reject) => {
        getGridlockQueue().then((result) => {
            // to update hold payment to get from nodes
            let holdPayment = [];
            allPayments = allPayments.concat(result);
            logger.debug(`all payments: ${JSON.stringify(allPayments)}`);
            return getHoldGridlockQueue();
        }).then((holdPayments) => {
            allPayments = allPayments.concat(holdPayments);
            resolve(allPayments);
        }).catch((exception) => {
            logger.error(`exception during get all payments: ${exception}`);
            reject(exception);
        });
    });
}

export function cancelQueuedPayment(request) {
    let paymentAgent = contracts.getContract('PaymentAgent');
    let transId = request.transId;
    let payment;

    logger.info(`cancelling payment ${transId}`);

    return new Promise((resolve, reject) => {
        getPaymentDetails(transId).then((paymentDetails) => {
            payment = paymentDetails;
            return isBankSuspended(payment.receiver);
        }).then((result) => {
            if (result) {
                return Promise.reject(new Error(400, "bank is suspended"));
            }
            return getActiveCounterparties();
        }).then((activeNodes) => {
            return cancelPayment(payment, activeNodes);
        }).then((cancelledPayment) => {
            payment.status = collection.PaymentStatus.CANCELLED;
            resolve(payment);
        }).catch((exception) => {
            logger.error(`exception during cancel payment: ${exception}`);
            reject(exception);
        });
    });

}

export function updatePaymentStatus(request) {

    let transId = request.transId;
    let status = request.status;
    let payment;

    logger.info(`Update payment ${transId} status to ${status} in the queue`);

    return new Promise((resolve, reject) => {

        getPaymentDetails(transId).then((paymentDetails) => {
            payment = paymentDetails;
            return isBankSuspended(payment.receiver);

        }).then((result) => {
            if (result) {
                return Promise.reject(new Error(400, "bank is suspended"));
            }
            return getActiveCounterparties();
        }).then((activeNodes) => {
            if (status == collection.PaymentStatus.HOLD.value) {

                payment.status = collection.PaymentStatus.HOLD;
                return holdPayment(payment, activeNodes);
            }
            else {

                payment.status = collection.PaymentStatus.ACTIVE;
                return unholdPayment(payment, activeNodes);
            }

        }).then((updatedStatus) => {
            resolve(payment);
        })
            .catch((exception) => {
                logger.error(`exception during update payment status: ${exception}`);
                reject(exception);
            });
    });
}

export function updatePaymentPriority(request) {

    let transId = request.transId;
    let priority = parseInt(request.priority);
    let payment;

    logger.info(`Update payment ${transId} priority to ${priority} in the queue`);

    return new Promise((resolve, reject) => {

        getPaymentDetails(transId).then((paymentDetails) => {
            payment = paymentDetails;
            payment.priority = priority;
            return isBankSuspended(payment.receiver);

        }).then((result) => {
            if (result) {
                return Promise.reject(new Error(400, "bank is suspended"));
            }
            return getActiveCounterparties();
        }).then((activeNodes) => {
            return updatePriority(payment, activeNodes);

        }).then((updatedStatus) => {
            resolve(payment);
        })
        .catch((exception) => {
            logger.error(`exception during update payment status: ${exception}`);
            reject(exception);
        });
    });
}