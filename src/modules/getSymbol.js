const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const abiToken = require('../../abiToken.json');

async function getTokenSymbol(tokenAddress) {
    try {
        const contract = new web3.eth.Contract(abiToken, tokenAddress);
        const symbol = await contract.methods.symbol().call();
        return symbol;
    } catch (error) {
        console.error('Error retrieving token symbol:', error);
        return null;
    }
}

module.exports = {
    getTokenSymbol
};
