import contract from 'truffle-contract';

import web3 from '../utils/web3';

const buildsFolder = '../../build/contracts';

const Contracts = {
  getBuild(name) {
    delete require.cache[require.resolve(`${buildsFolder}/${name}.json`)];
    this[name] = require(`${buildsFolder}/${name}.json`);
    return this[name];
  },

  getContract(name) {
    !this[name] ? this.getBuild(name) : '';

    if (!this[`${name}Contract`]) {
      const cont = contract(this[name]);
      cont.setProvider(web3.currentProvider);
      this[`${name}Contract`] = cont;
    }
    return this[`${name}Contract`];
  },

  getContractWithNewProvider(name, host, port) {

    !this[name] ? this.getBuild(name) : '';

    let cont = contract(this[name]);
    cont.setProvider(new web3.providers.HttpProvider(`http://${host}:${port}`));
    return cont;
  },

};

export default Contracts;
