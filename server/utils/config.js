import networkConfig from '../config/network.json';
import appConfig from '../config/application.json';
import removeByIdx from '../utils/arrayUtils';

let network = networkConfig;
let networkCopy =  network;
let index;
let myNode = network.filter((item) => item.stashName === process.argv[2])[0];
let counterpartiesPubKeys = network.filter((item) => item.stashName === process.argv[2]).map(node => node.constKey);

const conf = {
  allNodes: network,
  appConfig: appConfig,
  myConfig: myNode, 
  counterparties: counterpartiesPubKeys,
  regulatorConfig: network.filter((item) => item.regulator)[0],
  centralBankConfig: network.filter((item) => item.centralBank)[0]
};

export default conf;
