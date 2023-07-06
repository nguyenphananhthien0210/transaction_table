// const axios = require('axios');
// const { MongoClient } = require('mongodb');
// const Web3 = require('web3');
// const cron = require('cron');
// require('dotenv').config();

// const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

// const abiDml = require('./abiDml.json');
// const abiNft = require('./abiNft.json');
// const abiToken = require('./abiToken.json');

// const { getRatePriceFromDatabase } = require('./src/modules/convertToUSD.js');


// const uri = process.env.CONNECTED_MONGODB_URI
// const WORKER_DATA_DATABASE = process.env.COLLECTION_WORKER_DATA_DATABASE
// const COLLECTION_CURRENTBLOCK = process.env.COLLECTION_CURRENTBLOCK

// let isProcessing = false;

// async function collectData() {

//     if (isProcessing) {
//         console.log('Processing, pass...');
//         return;
//     }

//     try {

//         isProcessing = true;

//         const client = await MongoClient.connect(uri);
//         const db = client.db(WORKER_DATA_DATABASE);
//         const currentBlockCollection = db.collection(COLLECTION_CURRENTBLOCK);

//         const result = await currentBlockCollection.findOne();
//         const currentBlock = result ? result.currentBlock : 0;
//         console.log(`Current Block: `, currentBlock);

//         const latestBlockNumber = await web3.eth.getBlockNumber();
//         console.log(`Latest Block Number: `, latestBlockNumber);

//         if (currentBlock === latestBlockNumber) {
//             console.log('No new blocks to process');
//             return;
//         }

//         const query = `
//       query {
//         makeTransactions(
//           where: {
//             blockNumber_gt: ${currentBlock},
//             blockNumber_lte: ${latestBlockNumber}
//           }) {
//           id
//           action
//           amounttoken
//           amountnft
//           blockTime
//           blockNumber
//           dml
//           price
//           sender
//           to
//           transactionHash
//         }
//         makeLiquidities(
//           where: {
//             blockNumber_gt: ${currentBlock},
//             blockNumber_lte: ${latestBlockNumber}
//           }) {
//           id
//           action
//           amounttoken
//           amountnft
//           blockNumber
//           blockTime
//           dml
//           fee
//           liquidity
//           sender
//           to
//           transactionHash
//         }
//       }
//     `;

//         const response = await axios.post('https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2', {
//             query: query
//         });

//         const data = response.data.data;

//         const makeTransactionsData = data.makeTransactions;
//         const makeLiquiditiesData = data.makeLiquidities;

//         if (!makeTransactionsData || makeTransactionsData.length === 0) {
//             console.log('No makeTransactions data to process');
//             return;
//         }

//         if (!makeLiquiditiesData || makeLiquiditiesData.length === 0) {
//             console.log('No makeLiquidities data to process');
//             return;
//         }

//         const makeTransactionsCollection = db.collection('makeTransactionsCollection');
//         await makeTransactionsCollection.insertMany(makeTransactionsData);

//         const makeLiquiditiesCollection = db.collection('makeLiquiditiesCollection');
//         await makeLiquiditiesCollection.insertMany(makeLiquiditiesData);

//         for (let i = 0; i < makeTransactionsData.length; i++) {
//             const transaction = makeTransactionsData[i];

//             const volume = parseInt(transaction.amounttoken);
//             const tvl = await getTVL(transaction.dml);

//             const tokenSymbol = await getTokenSymbol(transaction.dml)
//             const tokenSymbolLowerCase = tokenSymbol.toLowerCase()
//             const ratePriceUSD = await getRatePriceFromDatabase(tokenSymbolLowerCase);

//             const decimals = await getDecimals(transaction.dml);

//             const price = parseFloat(transaction.price)

//             const priceInUSD = (price * ratePriceUSD) / Math.pow(10, decimals);
//             const volumeInUSD = (volume * ratePriceUSD) / Math.pow(10, decimals);
//             const tvlInUSD = (tvl * ratePriceUSD) / Math.pow(10, decimals);

//             transaction.volume = volume / Math.pow(10, decimals);
//             transaction.tvl = parseInt(tvl) / Math.pow(10, decimals);

//             transaction.volume = (volume) / Math.pow(10, decimals);
//             transaction.tvl = (tvl) / Math.pow(10, decimals);
//             transaction.priceInUSD = (priceInUSD);
//             transaction.volumeInUSD = (volumeInUSD);
//             transaction.tvlInUSD = (tvlInUSD);

//             await makeTransactionsCollection.updateOne(
//                 { _id: transaction._id },
//                 { $set: { volume: transaction.volume, tvl: transaction.tvl, priceInUSD: transaction.priceInUSD, volumeInUSD: transaction.volumeInUSD, tvlInUSD: transaction.tvlInUSD } },
//                 { upsert: true }
//             );
//         }

//         await currentBlockCollection.updateOne({}, { $set: { currentBlock: latestBlockNumber } });

//         client.close();
//     } catch (error) {
//         console.error(error);
//     } finally {
//         isProcessing = false;
//     }
// }

// async function getDecimals(dmlAddress) {
//     try {
//         const contractDml = new web3.eth.Contract(abiDml, dmlAddress);
//         const decimals = await contractDml.methods.decimals().call();
//         return decimals;
//     } catch (error) {
//         console.error('Error retrieving token decimals:', error);
//         return 18;
//     }
// }

// async function getTokenAddress(dmlAddress) {
//     try {
//         const contractDml = new web3.eth.Contract(abiDml, dmlAddress);
//         const tokenAddress = await contractDml.methods.token().call();
//         return tokenAddress;
//     } catch (error) {
//         console.error('Error retrieving token address:', error);
//         return null;
//     }
// }

// async function getTokenSymbol(dmlAddress) {
//     try {
//         const tokenAddress = await getTokenAddress(dmlAddress);
//         if (!tokenAddress) {
//             return null;
//         }
//         const contract = new web3.eth.Contract(abiToken, tokenAddress);
//         const symbol = await contract.methods.symbol().call();
//         return symbol;
//     } catch (error) {
//         console.error('Error retrieving token symbol:', error);
//         return null;
//     }
// }

// async function getTVL(dmlAddress) {
//     try {
//         const dmlContract = new web3.eth.Contract(abiDml, dmlAddress);
//         const tokenReserves = await dmlContract.methods.getReserves().call();
//         if (tokenReserves._reservetoken === 0) {
//             console.log("DML is no longer available!");
//             return 0;
//         }

//         return tokenReserves._reservetoken
//     } catch (error) {
//         console.error('Error retrieving TVL:', error);
//         return 0;
//     }
// }

// const job = new cron.CronJob('*/10 * * * * *', collectData);

// job.start();




/* 
const axios = require('axios');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');
const cron = require('cron');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const uri = process.env.CONNECTED_MONGODB_URI;
const WORKER_DATA_DATABASE = process.env.WORKER_DATA_DATABASE;
const CURRENT_BLOCK_COLLECTION = process.env.CURRENT_BLOCK_COLLECTION;
const MAKETRANSACTIONS_COLLECTION = process.env.MAKETRANSACTIONS_COLLECTION;
const MAKELIQUIDITIES_COLLECTION = process.env.MAKELIQUIDITIES_COLLECTION;

let isProcessing = false;

async function collectData() {
    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {
        isProcessing = true;

        const client = await MongoClient.connect(uri);
        const db = client.db(WORKER_DATA_DATABASE);
        const currentBlockCollection = db.collection(CURRENT_BLOCK_COLLECTION);

        const result = await currentBlockCollection.findOne();
        let lastProcessedBlock = result ? result.lastProcessedBlock : 36741510;
        console.log(`Last Processed Block: ${lastProcessedBlock}`);

        const latestBlockNumber = await web3.eth.getBlockNumber();
        console.log(`Latest Block Number: ${latestBlockNumber}`);

        if (lastProcessedBlock >= latestBlockNumber) {
            console.log('No new blocks to process');
            return;
        }

        const blockSize = 50;
        let currentBlock = lastProcessedBlock + 1;
        let hasMoreData = true;

        const makeTransactionsCollection = db.collection('makeTransactionsCollection');
        await makeTransactionsCollection.createIndex({ blockNumber: 1 });
        await makeTransactionsCollection.createIndex({ blockTime: 1 });

        const makeLiquiditiesCollection = db.collection('makeLiquiditiesCollection');
        await makeLiquiditiesCollection.createIndex({ blockNumber: 1 });
        await makeLiquiditiesCollection.createIndex({ blockTime: 1 });
        //await makeLiquiditiesCollection.createIndex({ action: 1 });
        //await makeLiquiditiesCollection.createIndex({ dml: 1 });

        while (hasMoreData && currentBlock <= latestBlockNumber) {
            try {
                const query = `
          query {
            makeTransactions(
              where: {
                blockNumber_gte: ${currentBlock},
                blockNumber_lte: ${currentBlock + blockSize - 1}
              }
            ) {
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
                blockNumber_gte: ${currentBlock},
                blockNumber_lte: ${currentBlock + blockSize - 1}
              }
            ) {
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

                if (!makeTransactionsData || makeTransactionsData.length === 0 || !makeLiquiditiesData || makeLiquiditiesData.length === 0) {
                    console.log(`No data to process for blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);
                    currentBlock += blockSize;
                    continue;
                }

                const makeTransactionsCollection = db.collection('makeTransactionsCollection');
                const makeTransactionsPromise = await makeTransactionsCollection.insertMany(makeTransactionsData);

                const makeLiquiditiesCollection = db.collection('makeLiquiditiesCollection');
                const makeLiquiditiesPromise = await makeLiquiditiesCollection.insertMany(makeLiquiditiesData);

                await Promise.all([makeTransactionsPromise, makeLiquiditiesPromise]);

                console.log(`Processed blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);

                lastProcessedBlock = currentBlock + blockSize - 1;

                currentBlock += blockSize;

                await currentBlockCollection.updateOne({}, { $set: { lastProcessedBlock } }, { upsert: true });
            } catch (error) {
                console.error(error);
                console.log(`Error processing blocks ${currentBlock} to ${currentBlock + blockSize - 1}, retrying...`);
            }
        }

        client.close();
    } catch (error) {
        console.error(error);
    } finally {
        isProcessing = false;
    }
}
*/
// const job = new cron.CronJob('*/10 * * * * *', collectData);
// job.start();





const axios = require('axios');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');
const cron = require('cron');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const uri = process.env.CONNECTED_MONGODB_URI;
const WORKER_DATA_DATABASE = process.env.WORKER_DATA_DATABASE;
const CURRENT_BLOCK_COLLECTION = process.env.CURRENT_BLOCK_COLLECTION;
const MAKETRANSACTIONS_COLLECTION = process.env.MAKETRANSACTIONS_COLLECTION;
const MAKELIQUIDITIES_COLLECTION = process.env.MAKELIQUIDITIES_COLLECTION;

const abiDml = require('./abiDml.json');
const abiToken = require('./abiToken.json');

const { getRatePrice } = require('./src/modules/convertUSD.js');

let isProcessing = false;

async function collectData() {
  if (isProcessing) {
    console.log('Processing, pass...');
    return;
  }

  try {
    isProcessing = true;

    const client = await MongoClient.connect(uri);
    const db = client.db(WORKER_DATA_DATABASE);
    const currentBlockCollection = db.collection(CURRENT_BLOCK_COLLECTION);

    const result = await currentBlockCollection.findOne();
    let lastProcessedBlock = result ? result.lastProcessedBlock : 36741510;
    console.log(`Last Processed Block: ${lastProcessedBlock}`);

    const latestBlockNumber = await web3.eth.getBlockNumber();
    console.log(`Latest Block Number: ${latestBlockNumber}`);

    if (lastProcessedBlock >= latestBlockNumber) {
      console.log('No new blocks to process');
      return;
    }

    const blockSize = 50;
    let currentBlock = lastProcessedBlock + 1;
    let hasMoreData = true;

    const makeTransactionsCollection = db.collection(MAKETRANSACTIONS_COLLECTION);
    await makeTransactionsCollection.createIndex({ blockTime: 1 });
    await makeTransactionsCollection.createIndex({ dml: 1 });

    const makeLiquiditiesCollection = db.collection(MAKELIQUIDITIES_COLLECTION);
    await makeLiquiditiesCollection.createIndex({ blockTime: 1 });
    await makeLiquiditiesCollection.createIndex({ dml: 1 });

    while (hasMoreData && currentBlock <= latestBlockNumber) {
      try {
        const query = `
          query {
            makeTransactions(
              where: {
                blockNumber_gte: ${currentBlock},
                blockNumber_lte: ${currentBlock + blockSize - 1}
              }
            ) {
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
                blockNumber_gte: ${currentBlock},
                blockNumber_lte: ${currentBlock + blockSize - 1}
              }
            ) {
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

        const makeTransactionsData = await Promise.all(data.makeTransactions.map(async (transaction) => {

          const symbol = await getTokenSymbol(transaction.dml)
          const priceRate = await getRatePrice(symbol)
          const decimals = await getDecimals(transaction.dml);
          const tvlTx = await getTVL(transaction.dml)

          const priceInUSD = parseInt(transaction.price) * priceRate / Math.pow(10, decimals);
          const amounttokenInUSD = parseInt(transaction.amounttoken) * priceRate / Math.pow(10, decimals);
          const tvlTxInUSD = parseInt(tvlTx) * priceRate / Math.pow(10, decimals)

          return {
            ...transaction,
            priceInUSD,
            amounttokenInUSD,
            tvlTxInUSD
          };
        }));

        const makeLiquiditiesData = await Promise.all(data.makeLiquidities.map(async (liquidity) => {

          const symbol = await getTokenSymbol(liquidity.dml)
          const priceRate = await getRatePrice(symbol)
          const decimals = await getDecimals(liquidity.dml);
          const tvlTx = await getTVL(liquidity.dml)

          const amounttokenInUSD = parseInt(liquidity.amounttoken) * priceRate / Math.pow(10, decimals);
          const tvlTxInUSD = parseInt(tvlTx) * priceRate / Math.pow(10, decimals)

          return {
            ...liquidity,
            amounttokenInUSD,
            tvlTxInUSD
          };
        }));

        if (!makeTransactionsData || makeTransactionsData.length === 0 || !makeLiquiditiesData || makeLiquiditiesData.length === 0) {
          console.log(`No data to process for blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);
          currentBlock += blockSize;
          continue;
        }

        const makeTransactionsCollection = db.collection(MAKETRANSACTIONS_COLLECTION);
        const makeTransactionsPromise = await makeTransactionsCollection.insertMany(makeTransactionsData);

        const makeLiquiditiesCollection = db.collection(MAKELIQUIDITIES_COLLECTION);
        const makeLiquiditiesPromise = await makeLiquiditiesCollection.insertMany(makeLiquiditiesData);

        await Promise.all([makeTransactionsPromise, makeLiquiditiesPromise]);

        console.log(`Processed blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);

        lastProcessedBlock = currentBlock + blockSize - 1;

        currentBlock += blockSize;

        await currentBlockCollection.updateOne({}, { $set: { lastProcessedBlock } }, { upsert: true });
      } catch (error) {
        console.error(error);
        console.log(`Error processing blocks ${currentBlock} to ${currentBlock + blockSize - 1}, retrying...`);
      }
    }

    client.close();
  } catch (error) {
    console.error(error);
  } finally {
    isProcessing = false;
  }
}

const job = new cron.CronJob('*/10 * * * * *', collectData);
job.start();

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
    // if (tokenReserves._reservetoken === 0) {
    //   console.log("DML is no longer available!");
    //   return 0;
    // }
    return tokenReserves._reservetoken
  } catch (error) {
    console.error('Error retrieving TVL:', error);
    return 0;
  }
}
