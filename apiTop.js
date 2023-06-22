const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const abiDml = require('./abiDml.json');
const abiNft = require('./abiNft.json');

const app = express();
const port = process.env.PORT || 4000;
const uri = process.env.CONNECTED_MONGODB_URI;

const getSymbolModule = require('./src/modules/getSymbol.js');

app.get('/top-nft', async (req, res) => {
    try {
        const client = await MongoClient.connect(uri);
        const db = client.db('TopNft');
        const makeTransactionsCollection = db.collection('makeTransactionsCollection');

        const transactions = await findTransactions(makeTransactionsCollection);

        const result = calculateResult(transactions);

        await fetchNftMetadata(result);

        await calculatePriceChange(result, transactions);

        await calculateTotalSupply(result);

        convertVolume(result);

        res.json(result);

        client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

async function findTransactions(collection) {
    const query = { action: 'Buy' };
    const transactions = await collection.find(query).sort({ blockTime: -1 }).toArray();
    return transactions;
}

function calculateResult(transactions) {
    const result = {};
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const { dml, amountnft, price } = transaction;
        const volume = amountnft * price * 2;

        if (!result[dml]) {
            result[dml] = {
                totalVolume: volume,
                currentPrice: price,
                previousPrice: null,
                priceChange: null,
            };
        } else {
            result[dml].totalVolume += volume;
            if (i > 0) {
                const previousTransaction = transactions[i - 1];
                result[dml].previousPrice = previousTransaction.price;
            }
        }
    }
    return result;
}

async function fetchNftMetadata(result) {
    for (const dml in result) {
        const { tokenId, contractAddressNFT } = await getNftInfo(dml);
        const metadata = await getUri(tokenId, contractAddressNFT);
        result[dml].metadata = metadata;

        const tokenAddress = await getTokenAddress(dml)
        const tokenSymbol = await getSymbolModule.getTokenSymbol(tokenAddress);
        result[dml].tokenSymbol = tokenSymbol;

    }
}

async function getTokenAddress(dmlAddress) {
    try {
        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);

        const tokenAddress = await contractDml.methods.token().call();

        return tokenAddress
    } catch (error) {
        console.error(error);
    }
}

async function getNftInfo(dmlAddress) {
    try {
        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);

        const tokenId = await contractDml.methods.id().call();
        const contractAddressNFT = await contractDml.methods.nft().call();

        return {
            tokenId,
            contractAddressNFT
        };
    } catch (error) {
        console.error(error);
    }
}

async function getUri(tokenId, contractAddressNFT) {
    try {
        const contractNft = new web3.eth.Contract(abiNft, contractAddressNFT);
        const uri = await contractNft.methods.uri(tokenId).call();
        const metadata = await getMetadata(uri)
        return metadata;
    } catch (error) {
        console.error('Error retrieving NFT name:', error);
        return null;
    }
}

async function getMetadata(uri) {
    try {
        const response = await axios.get(uri);
        const metadata = response.data;
        return metadata;
    } catch (error) {
        console.error('Error retrieving NFT metadata:', error);
        return null;
    }
}

async function calculatePriceChange(result, transactions) {
    for (const dml in result) {
        const { currentPrice, previousPrice } = result[dml];
        if (currentPrice && previousPrice) {
            const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
            result[dml].priceChange = priceChange;
        } else {
            result[dml].priceChange = 0;
        }
    }
}

async function calculateTotalSupply(result) {
    for (const dml in result) {
        const totalSupply = await getTotalSupply(dml);
        result[dml].totalSupply = totalSupply;
    }
}

async function getTotalSupply(dmlAddress) {
    try {
        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);

        const totalSupply = await contractDml.methods.totalSupply().call();

        return totalSupply

    } catch (error) {
        console.error(error);
    }
}

function convertVolume(result) {
    const decimals = 18;
    for (const dml in result) {
        result[dml].totalVolume /= Math.pow(10, decimals);
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
