import Web3 from 'web3';
import config from '../utils/config';
import Web3Admin from 'web3admin';

const web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider(`http://${config.myConfig.host}:${config.myConfig.port}`));
web3.eth.defaultAccount = web3.eth.accounts[config.myConfig.accountNumber];

setTimeout(function(){
    Web3Admin.extend(web3);
    
 }, 1000);


export default web3;
