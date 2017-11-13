const fs = require('fs');

var sgdz = JSON.parse(fs.readFileSync('build/contracts/SGDz.json', 'utf8'));
sgdz.networks['1'].address = "0x1932c48b2bf8102ba33b4a6b545c32236e342f34";
fs.writeFile('build/contracts/SGDz.json', JSON.stringify(sgdz),
	           err => { if(err) return console.log(err); });
