import express from 'express';
import {getNettingStatus} from '../services/nettingService';
const router = express.Router();

router.get('/status', (req, res) => {
    getNettingStatus()
      .then(result => res.status(200).send(result))
      .catch(error => res.status(500).send(error));
  
  });

  
module.exports = router;

