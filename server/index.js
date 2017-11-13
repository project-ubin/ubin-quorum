import getLogger from './utils/logger';
const logger = getLogger('Ubin DApp');

import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import http from 'http';
import {subscribeForIncomingPayment} from './events/paymentEvent';
import {subscribeForAgentStateChange} from './events/agentStateChangeEvent';
import {subscribeForBatchedCompleted} from './events/batchProposalCompleted';
import {subscribeForProposalCompleted} from './events/proposalCompleted';
import {subscribeForProposalInitiated} from './events/proposalInitiated';
import {subscribeForAmountHash} from './events/amountHash';
import {subscribeForDeadlock} from './events/deadlockEvent';
import {subscribeForAllDone} from './events/allDoneEvent';
import config from './utils/config';
import bankRouter from './routes/bankRouter';
import nettingRouter from './routes/nettingRouter';
import fundRouter from './routes/fundRouter';
import queueRouter from './routes/queueRouter';
import cors from 'cors';

const port = config.myConfig.localport; 
const app = express();

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/fund', fundRouter);
app.use('/api/netting', nettingRouter);
app.use('/api/bank', bankRouter);
app.use('/api/queue', queueRouter);
app.set('port', port);


logger.info ("***********************************")
logger.info ( "Starting API node for Bank:" + config.myConfig.stashName + " on local port: " + port);
const server = http.createServer(app);
server.listen(port);
logger.info ("");
logger.info('API Server launched');
logger.info ("");
logger.info ( "Connecting to remote Quorum node:" + config.myConfig.host + ":" + config.myConfig.port );
logger.info ("**********************************")


if(!config.myConfig.regulator){

    subscribeForIncomingPayment();
    subscribeForAmountHash();
    logger.info('Payment listener subscribed');

    subscribeForAgentStateChange();
    logger.info('Agent State Change listener subscribed');

    subscribeForAllDone();
    logger.info('All Done listener subscribed');

    subscribeForProposalInitiated();
    logger.info("Proposal Initiated listener subscribed");

    subscribeForProposalCompleted();
    logger.info("Proposal Completed listener subscribed");

    subscribeForDeadlock();
    logger.info("Deadlock listener subscribed");

    subscribeForBatchedCompleted();
    logger.info('BatchCompleted listener subscribed');
    logger.info ("**********************************")
}
module.exports = app;
