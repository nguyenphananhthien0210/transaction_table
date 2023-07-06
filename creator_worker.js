//Worker detects event TransferSingles

const axios = require('axios');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');
const cron = require('cron');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const URI = process.env.CONNECTED_MONGODB_URI;
const CREATOR_DATABASE = process.env.CREATOR_DATABASE;
const TRANSFERSINGLES_COLLECTION = process.env.TRANSFERSINGLES_COLLECTION
const LASTPROCESSEDBLOCK_COLLECTION = process.env.LASTPROCESSEDBLOCK_COLLECTION;

let isProcessing = false;

async function creatorWorker() {
    if (isProcessing) {
        console.log('Creator worker is processing, pass...');
        return;
    }

    try {
        isProcessing = true;

        const client = await MongoClient.connect(URI);
        const creatorDB = client.db(CREATOR_DATABASE);
        const transferSinglesCollection = creatorDB.collection(TRANSFERSINGLES_COLLECTION);
        const lastProcessedBlockCollection = creatorDB.collection(LASTPROCESSEDBLOCK_COLLECTION);

        const result = await lastProcessedBlockCollection.findOne();
        let lastProcessedBlock = result ? result.lastProcessedBlock : 36631495;
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
                orderBy: blockNumber
                orderDirection: asc
                where: { blockNumber_gte: ${currentBlock}, blockNumber_lte: ${currentBlock + blockSize - 1}}
            )   {
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

                await transferSinglesCollection.insertMany(transferSingles);

                console.log(`Processed blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);

                lastProcessedBlock = currentBlock + blockSize - 1;

                currentBlock += blockSize;

                await lastProcessedBlockCollection.updateOne({}, { $set: { lastProcessedBlock } }, { upsert: true });
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

const job = new cron.CronJob('*/10 * * * * *', creatorWorker);
job.start();