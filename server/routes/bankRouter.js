import express from 'express';

import {getBankInfo, getBankStatus, getCounterparties, getTransactionHistory, queryBankBalances, processSuspendBank, processUnsuspendBank, dummyApi, getSalt, setSalt} from '../services/bankService';
import {getActiveCounterparties, isBankSuspended} from '../adapter/networkAdapter'; 

const router = express.Router();

router.get('/info', (req, res) => {
  getBankInfo()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.get('/counterparties', (req, res) => {
  getCounterparties()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.get('/transactions/:filter?', (req, res) => {
  getTransactionHistory(req.params.filter)
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});


router.get('/status/:bic', (req, res) => {
  isBankSuspended(req.params.bic)
    .then(result => res.status(201).send(result))
    .catch(error => res.status(500).send(error));
});

router.get('/balance/all', (req, res) => {
  queryBankBalances(req.body)
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

router.post('/suspend', (req, res) => {
  processSuspendBank(req.body)
  .then(result => res.status(201).send(result))
  .catch(error => res.status(500).send(error));
});

router.post('/unsuspend', (req, res) => {
  processUnsuspendBank(req.body)
  .then(result => res.status(201).send(result))
  .catch(error => res.status(500).send(error));
});

router.get('/active', (req, res) => {
  getActiveCounterparties(req.body)
  .then(result => res.status(200).send(result))
  .catch(error => res.status(500).send(error));
});

router.get('/salt', (req, res) => {
  getSalt()
  .then(result => res.status(200).send(result))
  .catch(error => res.status(500).send(error));
});


router.put('/salt', (req, res) => {
  setSalt(req.body)
  .then(result => res.status(200).send(result))
  .catch(error => res.status(500).send(error));
});


router.get('/test', (req, res) => {
  dummyApi()
    .then(result => res.status(200).send(result))
    .catch(error => res.status(500).send(error));
});

module.exports = router;
