const fs = require('fs');

var config = JSON.parse(fs.readFileSync('networkNodesInfo.json', 'utf8'));

var nettingConfig = [];

var stashNames = {
  "01" : "MASREGULATOR",
  "02" : "MASGSGSG",
  "03" : "BOFASG2X",
  "04" : "CHASSGSG",
  "05" : "CITISGSG",
  "06" : "CSFBSGSX",
  "07" : "DBSSSGSG",
  "08" : "HSBCSGSG",
  "09" : "MTBCSGSG",
  "10" : "OCBCSGSG",
  "12" : "SCBLSGSG",
  "14" : "UOBVSGSG",
  "15" : "XSIMSGSG"
};


var counter = 0;

Object.keys(config).forEach( enode => {
  let nodeId = config[enode].nodeName.slice(2,4);
  let centralBank = false;
  let regulator = false;
  let stashName = stashNames[nodeId];
  if (stashName === "MASGSGSG") centralBank = true;
  if (stashName === "MASREGULATOR") regulator = true;
  let nodeConfig = {
    "nodeId" : parseInt(nodeId),
    "host" : "quorumnx"+nodeId+".southeastasia.cloudapp.azure.com",
    "port": "20010",
    "accountNumber" : 0,
    "ethKey" : config[enode].address,
    "constKey" : config[enode].constellationPublicKey,
    "stashName" : stashName,
    "enode" : enode,
    "centralBank" : centralBank,
    "regulator" : regulator,
    "localport" : 3000
  };
  nettingConfig.push(nodeConfig);

  counter++;

});

nettingConfig.sort((a,b) => { return a.nodeId - b.nodeId; });

fs.writeFile('test-scripts/config/config.json', JSON.stringify(nettingConfig),
             err => { if(err) console.log(err); });

var testnet = { "nodes" : nettingConfig.map(i => i.constKey) };

fs.writeFile('testnet.json', JSON.stringify(testnet),
             err => { if(err) console.log(err); });


fs.writeFile('server/config/network.json', JSON.stringify(nettingConfig),
            err => { if(err) console.log(err); });
