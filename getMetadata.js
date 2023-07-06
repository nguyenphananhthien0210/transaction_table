
const axios = require('axios');
const Web3 = require('web3');
const cron = require('cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const abiDml = require('./abiDml.json');
const abiNft = require('./abiNft.json');

const URI = process.env.CONNECTED_MONGODB_URI
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE
const COLLECTION_CURRENTBLOCK = process.env.COLLECTION_CURRENTBLOCK
const COLLECTION_CREATOR = process.env.COLLECTION_CREATOR

let isProcessing = false;

async function fetchData() {

    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {

        isProcessing = true;

        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);
        const currentBlockCollection = db.collection(COLLECTION_CURRENTBLOCK);

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
                Factory_Contract_id
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

        for (const transaction of dmlTokenCreateds) {
            const dmlAddress = transaction.dmlToken;

            const tokenId = transaction.Factory_Contract_id;
            const nftAddress = transaction.nft;

            const db = client.db('metadataList');
            const creatorCollection = db.collection('creator');

            const creator = await creatorCollection
                .find({
                    from: "0x0000000000000000000000000000000000000000",
                    Creator_Contract_id: tokenId,
                    //nftAddress: nftAddress
                })
                .toArray();

            let to = null;
            let blockTimestamp = null;

            if (creator.length > 0) {
                to = creator[0].to;
                blockTimestamp = creator[0].blockTimestamp;
            }

            const metadata = await getMetadata(nftAddress, tokenId);
            const data = {
                dmlAddress,
                metadata,
                creatorAddress: to,
                blockTimestamp
            };

            await collection.insertOne(data);

            console.log(data);


        }

        await currentBlockCollection.updateOne({}, { $set: { currentBlock: latestBlockNumber } });

        await client.close();
    } catch (error) {
        console.error(error);
    } finally {
        isProcessing = false;
    }
}

async function getMetadata(nftAddress, tokenId) {
    try {
        const nftContract = new web3.eth.Contract(abiNft, nftAddress);
        const uri = await nftContract.methods.uri(tokenId).call();

        const response = await axios.get(uri);
        const metadata = response.data;

        if (!metadata) {
            return { name: `${nftAddress}:${tokenId}` };
        } else {
            return metadata;
        }
    } catch (error) {
        console.error(error);
        return { name: `${nftAddress}:${tokenId}` };
    }
}

const job = new cron.CronJob('*/10 * * * * *', fetchData);

job.start();