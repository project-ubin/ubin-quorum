var fs = require('fs');
const chalk = require('chalk');
var sha3 = require('solidity-sha3').default;
var Promise = require('bluebird');
var jsSha = require('jssha')
var rand = require('csprng');

module.exports = {

  //search for unique value in nodes object key
  //optional: retKey ===> returns value of another key
  //assume all values are unique
  searchNode : function (nodesObj, key, searchVal, retKey){
    for (let i in nodesObj){
      if (searchVal === nodesObj[i][key]){
        if (typeof retKey === "undefined"){
          return i;
        }else{
          return nodesObj[i][retKey];
        }
      }
    }
  },

  getStashName : function (nodesObj, ethKey){
    let i = this.searchNode(nodesObj, 'ethKey', ethKey);
    return nodesObj[i].stashName;
  },

  removeMe : function (nodesObj, stashName){
    let i = this.searchNode(nodesObj, 'stashName', stashName);
    nodesObj.splice(i, 1);
    return nodesObj;
  },

  //MAS (central bank) will always be included
  removeOthers : function (nodesObj, keep1, keep2){
    let i = this.searchNode(nodesObj, 'stashName', keep1);
    let mas = this.searchNode(nodesObj, 'centralBank', true);
    let objArr = [ nodesObj[mas], nodesObj[i] ];

    if(typeof keep2 === "undefined") {
            keep2 = null;
    }else{
      objArr.push(nodesObj[this.searchNode(nodesObj, 'stashName', keep2)]);
    }

    return objArr;
  },


  //assume there is only 1 central bank
  // getCentralBankName : function (nodesObj){
  //   let i = this.searchNode(nodesObj, 'centralBank', true);
  //   return nodesObj[i].stashName;

  // }
  
  getValueFromAllNodes : function (nodesObj, key){
    var arr = [];
    for (var i in nodesObj){
      arr.push(nodesObj[i][key]);
    }
    return arr;
  },

  generateSalt : function (){
    return rand(128, 16)
  },

  saltInt : function(data, salt){
    
        let saltedData = "0x"+ this.lpad( data.toString(16), "0", 32) + salt;
        return saltedData;
        
  },
    
  hashData: function(data){
    let shaObj = new jsSha("SHA-256", "HEX");
    shaObj.update(data.slice(2));
    return "0x"+shaObj.getHash("HEX");
  },

  lpad:function(data, padString, length){
    let str = data;
    while (str.length < length)
      str = padString + str;
    return str;
  } 
  
};
module.exports.promiseFor = Promise.method(function(condition, action, value) {
  if (!condition(value)) return value;
  return action(value).then(promiseFor.bind(null, condition, action));
});

