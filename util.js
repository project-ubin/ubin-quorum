var fs = require('fs');
const chalk = require('chalk');
var sha3 = require('solidity-sha3').default;
var Promise = require("bluebird");

module.exports = {

    hex2a : function (hexx) {
        var hex = hexx.toString(); //force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2){
            let ans = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            if(ans !== '\u0000'){
	              str += ans;
            }
        }
        return str;
    },

    a2hex : function (str, size) {
        var hex = '';
        for (var i = 0; i < size; i++) {
            if (i < str.length){
	              hex += ''+str.charCodeAt(i).toString(16);
            } else {
	              hex += '0';
            }
        }
        return '0x'+hex;
    },

    getCurrentNetwork : function (web3) {
        var truffle = require('./truffle.js');
        var port = web3.currentProvider.host.split(':')[2];
        var currentNetwork;
        Object.keys(truffle.networks).forEach((i) => {
            if (truffle.networks[i].port == port) {
	              currentNetwork = i;
            }
        });
        return currentNetwork;
    },

    colorLog : function (str, currentNetwork) {
        if (currentNetwork == 'a') {
            console.log(chalk.blue(str));
        } else if (currentNetwork == 'b') {
            console.log(chalk.green(str));
        } else if (currentNetwork == 'c') {
            console.log(chalk.magenta(str));
        } else if (currentNetwork == 'd') {
            console.log(chalk.red(str));
        } else if (currentNetwork == 'e') {
            console.log(chalk.yellow(str));
        } else if (currentNetwork == 'f') {
            console.log(chalk.cyan(str));
        } else {
            console.log(str);
        }
    },

    sha3bytes32 : function (input) {
        return sha3(module.exports.a2hex(input, 60));
    },

    checkNegativeUint : function (num) {
        let minusone = 1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77;
        return num == minusone;
    },

    removeByIdx : function (array, index) {
        return array.filter((i) => { return array.indexOf(i) != index; });
    },

};

module.exports.promiseFor = Promise.method(function(condition, action, value) {
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
});
