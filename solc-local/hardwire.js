const fs = require('fs');

const zAddress = fs.readFileSync('zAddress', 'utf8');

var sgdz = JSON.parse(fs.readFileSync('../build/contracts/SGDz.json', 'utf8'));
sgdz.networks['1'].address = zAddress;
fs.writeFile('../build/contracts/SGDz.json', JSON.stringify(sgdz),
	           err => { if(err) return console.log(err); });
