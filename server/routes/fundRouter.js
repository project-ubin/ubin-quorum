import express from 'express';
import {processPayment, updateObligationPriority, pledgeFunds, redeemFunds, verifyPayment, settleOutgoingQueue, getCurrentSalt} from '../services/fundService';
import {getIncomingQueue, getAllQueue, getOutgoingQueue, updatelObligationStatus, cancelObligation} from '../services/queueService';
import {getBalance, getDetails, getAllTransactions, suspendBank, unsuspendBank} from '../services/bankService';

const router = express.Router();

router.post('/pledge', (req, res) => {
  pledgeFunds(req.body)
    .then(result => res.status(201).send(result))
    .catch(error => res.status(500).send(error));
});

router.post('/redeem', (req, res) => {
  redeemFunds(req.body)
    .then(result => res.status(201).send(result))
    .catch(error => res.status(500).send(error));
});

router.post('/transfer', (req, res) => {
  processPayment(req.body)
    .then(result => res.status(201).send(result))
    .catch(error => res.status(500).send(error));
});

module.exports = router;
