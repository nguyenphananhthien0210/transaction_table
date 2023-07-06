//Worker detect event transferSingles and dmlTokenCreateds and get metadata list

const axios = require('axios');
const Web3 = require('web3');
const cron = require('cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));

const abiToken = require('./abiToken.json');
const abiNft = require('./abiNft.json');

const URI = process.env.CONNECTED_MONGODB_URI
const DML_DATABASE = process.env.DML_DATABASE;
const DML_COLLECTION = process.env.DML_COLLECTION;
const METADATA_COLLECTION = process.env.METADATA_COLLECTION;
const CREATOR_DATABASE = process.env.CREATOR_DATABASE
const TRANSFERSINGLES_COLLECTION = process.env.TRANSFERSINGLES_COLLECTION

const LASTPROCESSEDBLOCK_COLLECTION = process.env.LASTPROCESSEDBLOCK_COLLECTION;


const client = new MongoClient(URI);

let isProcessing = false;

async function dmlWorker() {

    if (isProcessing) {
        console.log('Processing, pass...');
        return;
    }

    try {

        isProcessing = true;

        await client.connect();
        const dmlDB = client.db(DML_DATABASE);
        const dmlCollection = dmlDB.collection(DML_COLLECTION);
        const metadataCollection = dmlDB.collection(METADATA_COLLECTION);

        const lastProcessedBlockCollection = dmlDB.collection(LASTPROCESSEDBLOCK_COLLECTION);
        //const creatorDB = client.db(CREATOR_DATABASE);
        const transferSinglesCollection = dmlDB.collection(TRANSFERSINGLES_COLLECTION);

        const result = await lastProcessedBlockCollection.findOne();
        const lastProcessedBlock = result ? result.lastProcessedBlock : 36631495;
        console.log(`Last Processed Block: ${lastProcessedBlock}`);

        const latestBlockNumber = await web3.eth.getBlockNumber();
        console.log(`Lastest Block Number: `, latestBlockNumber)

        if (lastProcessedBlock >= latestBlockNumber) {
            console.log('No new blocks to process');
            return;
        }

        const blockSize = 50;
        let currentBlock = lastProcessedBlock + 1;
        let hasMoreData = true;

        while (hasMoreData && currentBlock <= latestBlockNumber) {

            try {
                const query = `query {
                    transferSingles(
                        orderBy: blockNumber,
                        orderDirection: asc,
                        first: 1000,
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
                    dmlTokenCreateds(
                        orderBy: blockNumber,
                        orderDirection: asc,
                        first: 1000,
                        where: { blockNumber_gte: ${currentBlock}, blockNumber_lte: ${currentBlock + blockSize - 1}}
                    )   {
                        blockNumber
                        Factory_Contract_id
                        blockTimestamp
                        dmlToken
                        erc
                        nft
                        length
                        id
                        transactionHash
                    }
                }`;

                const response = await axios.post('https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/version/latest', {
                    query: query
                });

                const transferSingles = response.data.data.transferSingles;
                const dmlTokenCreateds = response.data.data.dmlTokenCreateds;

                if (transferSingles.length === 0 && dmlTokenCreateds.length === 0) {
                    console.log(`No data to process for blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);
                    currentBlock += blockSize;
                    continue;
                }

                if (transferSingles.length > 0) {
                    const UpdateTransferSingles = await Promise.all(transferSingles.map(async (transferSingle) => ({
                        ...transferSingle,
                        nftAddress: "0x519d124e4f2e536f36ce9f54add6cd3022c16c70"
                    })));

                    await transferSinglesCollection.insertMany(UpdateTransferSingles);
                }

                if (dmlTokenCreateds.length > 0) {
                    const dmlTokenBatch = await Promise.all(dmlTokenCreateds.map(async (dmlToken) => {
                        try {
                            dmlToken.tokenName = await getTokenName(dmlToken.erc);
                        } catch (error) {
                            console.error('Error getting tokenName:', error);
                            dmlToken.tokenName = 'Unknown';
                        }
                        return dmlToken;
                    }));

                    await dmlCollection.insertMany(dmlTokenBatch);

                    const metadataBatch = [];
                    for (const dml of dmlTokenCreateds) {
                        const dmlAddress = dml.dmlToken;
                        const tokenId = dml.Factory_Contract_id;
                        const nft = dml.nft;

                        const creator = await transferSinglesCollection
                            .find({
                                from: "0x0000000000000000000000000000000000000000",
                                Creator_Contract_id: tokenId,
                                nftAddress: nft
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

                        metadataBatch.push(data);
                    }

                    if (metadataBatch.length > 0) {
                        await metadataCollection.insertMany(metadataBatch);
                        console.log(metadataBatch);
                    }
                }

                console.log(`Processed blocks ${currentBlock} to ${currentBlock + blockSize - 1}`);
                lastProcessedBlock = currentBlock + blockSize - 1;
                currentBlock += blockSize;

                await currentBlockCollection.updateOne({}, { $set: { currentBlock: latestBlockNumber } });
            } catch (error) {
                console.error(error);
                console.log(`Error processing blocks ${currentBlock} to ${currentBlock + blockSize - 1}, retrying...`);
            }
        }
        await client.close();
    } catch (error) {
        console.error(error);
    } finally {
        isProcessing = false;
    }
}

async function getTokenName(erc) {
    const contractToken = new web3.eth.Contract(abiToken, erc);
    const tokenName = await contractToken.methods.name().call();
    return tokenName
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

const job = new cron.CronJob('*/10 * * * * *', dmlWorker);

job.start();