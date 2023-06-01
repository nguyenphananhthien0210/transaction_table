const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

module.exports = web3;
