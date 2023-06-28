const axios = require('axios');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');
const cron = require('cron');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const abiDml = require('./abiDml.json');
const abiNft = require('./abiNft.json');
const abiToken = require('./abiToken.json');

const { getRatePriceFromDatabase } = require('./src/modules/convertToUSD.js');


const uri = process.env.CONNECTED_MONGODB_URI
const DATA_DATABASE = process.env.COLLECTION_DATA_DATABASE
const COLLECTION_CURRENTBLOCK = process.env.COLLECTION_CURRENTBLOCK

let isProcessing = false;

async function collectData() {

    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {

        isProcessing = true;

        const client = await MongoClient.connect(uri);
        const db = client.db(DATA_DATABASE);
        const currentBlockCollection = db.collection(COLLECTION_CURRENTBLOCK);

        const result = await currentBlockCollection.findOne();
        const currentBlock = result ? result.currentBlock : 0;
        console.log(`Current Block: `, currentBlock);

        const latestBlockNumber = await web3.eth.getBlockNumber();
        console.log(`Latest Block Number: `, latestBlockNumber);

        if (currentBlock === latestBlockNumber) {
            console.log('No new blocks to process');
            return;
        }

        const query = `
      query {
        makeTransactions(
          where: {
            blockNumber_gt: ${currentBlock},
            blockNumber_lte: ${latestBlockNumber}
          }) {
          id
          action
          amounttoken
          amountnft
          blockTime
          blockNumber
          dml
          price
          sender
          to
          transactionHash
        }
        makeLiquidities(
          where: {
            blockNumber_gt: ${currentBlock},
            blockNumber_lte: ${latestBlockNumber}
          }) {
          id
          action
          amounttoken
          amountnft
          blockNumber
          blockTime
          dml
          fee
          liquidity
          sender
          to
          transactionHash
        }
      }
    `;

        const response = await axios.post('https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2', {
            query: query
        });

        const data = response.data.data;

        const makeTransactionsData = data.makeTransactions;
        const makeLiquiditiesData = data.makeLiquidities;

        if (!makeTransactionsData || makeTransactionsData.length === 0) {
            console.log('No makeTransactions data to process');
            return;
        }

        if (!makeLiquiditiesData || makeLiquiditiesData.length === 0) {
            console.log('No makeLiquidities data to process');
            return;
        }

        const makeTransactionsCollection = db.collection('makeTransactionsCollection');
        await makeTransactionsCollection.insertMany(makeTransactionsData);

        const makeLiquiditiesCollection = db.collection('makeLiquiditiesCollection');
        await makeLiquiditiesCollection.insertMany(makeLiquiditiesData);

        for (let i = 0; i < makeTransactionsData.length; i++) {
            const transaction = makeTransactionsData[i];

            const volume = parseInt(transaction.amounttoken);
            const tvl = await getTVL(transaction.dml);

            const tokenSymbol = await getTokenSymbol(transaction.dml)
            const tokenSymbolLowerCase = tokenSymbol.toLowerCase()
            const ratePriceUSD = await getRatePriceFromDatabase(tokenSymbolLowerCase);

            const decimals = await getDecimals(transaction.dml);

            const price = parseFloat(transaction.price)

            const priceInUSD = (price * ratePriceUSD) / Math.pow(10, decimals);
            const volumeInUSD = (volume * ratePriceUSD) / Math.pow(10, decimals);
            const tvlInUSD = (tvl * ratePriceUSD) / Math.pow(10, decimals);

            transaction.volume = volume / Math.pow(10, decimals);
            transaction.tvl = parseInt(tvl) / Math.pow(10, decimals);

            transaction.volume = (volume) / Math.pow(10, decimals);
            transaction.tvl = (tvl) / Math.pow(10, decimals);
            transaction.priceInUSD = (priceInUSD);
            transaction.volumeInUSD = (volumeInUSD);
            transaction.tvlInUSD = (tvlInUSD);

            await makeTransactionsCollection.updateOne(
                { _id: transaction._id },
                { $set: { volume: transaction.volume, tvl: transaction.tvl, priceInUSD: transaction.priceInUSD, volumeInUSD: transaction.volumeInUSD, tvlInUSD: transaction.tvlInUSD } },
                { upsert: true }
            );
        }

        await currentBlockCollection.updateOne({}, { $set: { currentBlock: latestBlockNumber } });

        client.close();
    } catch (error) {
        console.error(error);
    } finally {
        isProcessing = false;
    }
}

async function getDecimals(dmlAddress) {
    try {
        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);
        const decimals = await contractDml.methods.decimals().call();
        return decimals;
    } catch (error) {
        console.error('Error retrieving token decimals:', error);
        return 18;
    }
}

async function getTokenAddress(dmlAddress) {
    try {
        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);
        const tokenAddress = await contractDml.methods.token().call();
        return tokenAddress;
    } catch (error) {
        console.error('Error retrieving token address:', error);
        return null;
    }
}

async function getTokenSymbol(dmlAddress) {
    try {
        const tokenAddress = await getTokenAddress(dmlAddress);
        if (!tokenAddress) {
            return null;
        }
        const contract = new web3.eth.Contract(abiToken, tokenAddress);
        const symbol = await contract.methods.symbol().call();
        return symbol;
    } catch (error) {
        console.error('Error retrieving token symbol:', error);
        return null;
    }
}

async function getTVL(dmlAddress) {
    try {
        const dmlContract = new web3.eth.Contract(abiDml, dmlAddress);
        const tokenReserves = await dmlContract.methods.getReserves().call();
        if (tokenReserves._reservetoken === 0) {
            console.log("DML is no longer available!");
            return 0;
        }

        return tokenReserves._reservetoken
    } catch (error) {
        console.error('Error retrieving TVL:', error);
        return 0;
    }
}

const job = new cron.CronJob('*/10 * * * * *', collectData);

job.start();