const fs = require('fs');

const ownedSource = fs.readFileSync('../contracts/Owned.sol', 'utf8')
      .split("\n").slice(1).reduce( (a, b) => { return a+b+'\n'; } );

const precompileSource = fs.readFileSync('../contracts/ZSLPrecompile.sol', 'utf8')
      .split("\n").slice(1).reduce( (a, b) => { return a+b+'\n'; } );

const sgdzSource = fs.readFileSync('../contracts/SGDz.sol', 'utf8')
      .split("\n").slice(3).reduce( (a, b) => { return a+b+'\n'; } ).replace("_;", "_");

const input = (ownedSource+precompileSource+sgdzSource)
      .replace("_;", "_");


fs.writeFile('all.sol', input,
             err => { if(err) console.log(err); });
