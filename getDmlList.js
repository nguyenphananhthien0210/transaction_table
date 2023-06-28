const axios = require('axios');
const Web3 = require('web3');
const cron = require('cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const uri = process.env.CONNECTED_MONGODB_URI
const DATA_DATABASE = process.env.DATABASE_TEST;
const DML_COLLECTION = process.env.DML_COLLECTION;
const COLLECTION_CURRENTBLOCK_2 = process.env.COLLECTION_CURRENTBLOCK_2;

let isProcessing = false;

async function getDml() {

    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {

        isProcessing = true;

        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(DATA_DATABASE);
        const dmlCollection = db.collection(DML_COLLECTION);
        const currentBlockCollection = db.collection(COLLECTION_CURRENTBLOCK_2);

        // Create indexes for the desired fields
        await dmlCollection.createIndex({ erc: 1 });
        await dmlCollection.createIndex({ dmlToken: 1 });
        await dmlCollection.createIndex({ nft: 1 });
        await dmlCollection.createIndex({ nft: 1, erc: 1 });
        await dmlCollection.createIndex({ nft: 1, erc: 1, dmlToken: 1 });

        const result = await currentBlockCollection.findOne();
        const currentBlock = result ? result.currentBlock : 0;
        console.log(`Current Block: `, currentBlock)

        const latestBlockNumber = await web3.eth.getBlockNumber();
        console.log(`Lastest Block Number: `, latestBlockNumber)

        if (currentBlock === latestBlockNumber) {
            console.log('No new blocks to process');
            return;
        }

        const response = await axios.post('https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2', {
            query: `
        {
            dmlTokenCreateds(
                where: {
                blockNumber_gt: ${currentBlock},
                blockNumber_lte: ${latestBlockNumber}
                }
            ) {
                blockNumber
                dmlToken
                erc
                id
                length
                nft
                transactionHash
            }
        }
      `,
        });

        const dmlTokenCreateds = response.data.data.dmlTokenCreateds;

        if (!dmlTokenCreateds || dmlTokenCreateds.length === 0) {
            console.log('No dmlTokenCreateds data to process');
            return;
        }

        await dmlCollection.insertMany(dmlTokenCreateds);

        await currentBlockCollection.updateOne({}, { $set: { currentBlock: latestBlockNumber } });

        await client.close();
    } catch (error) {
        console.error(error);
    } finally {
        isProcessing = false;
    }
}

const job = new cron.CronJob('*/10 * * * * *', getDml);

job.start();