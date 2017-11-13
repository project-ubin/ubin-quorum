import express from 'express';
import {getIncomingQueue, getQueue, getOutgoingQueue, updatePaymentStatus, cancelQueuedPayment,updatePaymentPriority } from '../services/queueService';
import {settleQueuedPayments} from '../services/fundService';
import {getNettingStatus} from '../services/nettingService';

const router = express.Router();

router.get('/', (req, res) => {
  getQueue()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.get('/in', (req, res) => {
  getIncomingQueue()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.get('/out', (req, res) => {
  getOutgoingQueue()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.put('/priority', (req, res) => {
  updatePaymentPriority(req.body)
    .then(result => res.status(201).send(result))
    .catch(error => res.status(500).send(error));
});

router.put('/cancel', (req, res) => {
  cancelQueuedPayment(req.body)
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.put('/status', (req, res) => {
  updatePaymentStatus(req.body)
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.put('/settle', (req, res) => {
  settleQueuedPayments()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

module.exports = router;
