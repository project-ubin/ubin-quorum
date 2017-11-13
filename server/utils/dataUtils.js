import moment from 'moment';
import jsSha from 'jssha';
import web3 from '../utils/web3';
import rand from 'csprng';
import uuidv4 from 'uuid/v4';

export function convertHexxtoString(hexx) {
  var hex = hexx.toString() //force conversion
  var str = ''
  for (var i = 0; i < hex.length; i += 2) {
    let ans = String.fromCharCode(parseInt(hex.substr(i, 2), 16))
    if (ans !== '\u0000') {
      str += ans
    }
  }
  return str;
}

export function formatDate(millis) {

  let date = moment.unix(millis / 1000000000).toISOString();
  return date;
}

export function generateSalt() {
  return rand(128, 16);
}

export function saltInt(data, salt) {

  let saltedData = "0x" + lpad(data.toString(16), "0", 32) + salt;
  return saltedData;

}

export function hashData(data) {
  let shaObj = new jsSha("SHA-256", "HEX");
  shaObj.update(data.slice(2));
  return "0x" + shaObj.getHash("HEX");
}

export function lpad(data, padString, length) {
  let str = data;
  while (str.length < length)
    str = padString + str;
  return str;
}

export function getString(data) {
  return web3.toAscii(data).replace(/\u0000/g, '');
}

export function generateTransactionId() {
  return uuidv4();
}