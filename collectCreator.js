
const axios = require('axios');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');
const cron = require('cron');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const uri = process.env.CONNECTED_MONGODB_URI;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;
const CURRENT_BLOCK_COLLECTION_3 = process.env.CURRENT_BLOCK_COLLECTION_3;
const COLLECTION_CREATOR = process.env.COLLECTION_CREATOR

const abiDml = require('./abiDml.json');
const abiToken = require('./abiToken.json');


let isProcessing = false;

async function collectData() {
    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {
        isProcessing = true;

        const client = await MongoClient.connect(uri);
        const db = client.db(COLLECTION_HOMEPAGE);
        const currentBlockCollection = db.collection(CURRENT_BLOCK_COLLECTION_3);

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

        while (hasMoreData && currentBlock <= latestBlockNumber) {
            try {
                const query = `
          query {
            transferSingles(
                where: { blockNumber_gte: ${currentBlock}, blockNumber_lte: ${currentBlock + blockSize - 1}}
              ) {
                Creator_Contract_id
                blockNumber
                from
                blockTimestamp
                id
                operator
                to
                transactionHash
                value
              }
          }
        `;

                const response = await axios.post('https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2', {
                    query: query
                });

                const transferSingles = response.data.data.transferSingles;

                if (!transferSingles || transferSingles.length === 0) {
                    console.log(`No data to process for blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);
                    currentBlock += blockSize;
                    continue;
                }

                const creatorCollection = db.collection(COLLECTION_CREATOR);

                await creatorCollection.insertMany(transferSingles);

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