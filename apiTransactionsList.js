
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));
const axios = require('axios');

const moment = require('moment');

const express = require('express');
const app = express();
const port = 3000;

const { MongoClient } = require('mongodb');
require('dotenv').config();

const abiDml = require('./dmlAbi.json')
const abiNft = require('./nftAbi.json')

const uri = process.env.CONNECTED_MONGODB_URI;
const client = new MongoClient(uri);

let lastProcessedBlock = 0; // Giá trị block cuối cùng đã xử lý
let isProcessing = false;

async function querySubgraph() {

    if (isProcessing) {
        console.log('Previous processing is still in progress. Skipping...');
        return;
    }

    try {
        isProcessing = true;
        try {
            await client.connect();
            console.log('Connected to MongoDB successfully');

            // Đọc giá trị block cuối cùng đã xử lý từ cơ sở dữ liệu
            const metadataCollection = client.db(process.env.DATABASE_NAME).collection(process.env.METADATA_COLLECTION_NAME);
            const metadata = await metadataCollection.findOne({});
            lastProcessedBlock = metadata ? metadata.lastProcessedBlock : 0;

            // Lấy số block hiện tại
            const currentBlockNumber = await web3.eth.getBlockNumber();


            const apiUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark/2';
            const response = await axios.post(apiUrl, {
                query: `
        query {
          makeTransactions (where: { blockNumber_gt: ${lastProcessedBlock}, blockNumber_lte: ${currentBlockNumber} }){
            id
            action
            amounterc
            amountnft
            blockTime
            blockNumber
            dml
            price
            sender
            to
            transactionHash
          }
        }
      `,
            });

            const results = response.data.data.makeTransactions;
            const newRecords = [];

            for (const record of results) {

                const { blockNumber } = record;

                if (blockNumber > lastProcessedBlock) {
                    const { dml } = record;
                    const { tokenName, nftName } = await getNftAndTokenName(dml);
                    const existingAction = record.action;
                    const updatedAction = `${existingAction} ${nftName} from ${tokenName}`;
                    record.action = updatedAction;

                    console.log('Updated Action:', updatedAction);

                    // Check if record already exists
                    const collection = client.db(process.env.DATABASE_NAME).collection(process.env.COLLECTION_NAME);
                    const existingRecord = await collection.findOne({ id: record.id });

                    if (existingRecord) {
                        console.log(`Record with id ${record.id} already exists. Skipping insertion.`);
                    } else {
                        newRecords.push(record);
                    }
                }
            }

            /// Insert new records into the database
            if (newRecords.length > 0) {
                const collection = client.db(process.env.DATABASE_NAME).collection(process.env.COLLECTION_NAME);
                const insertResult = await collection.insertMany(newRecords);
                console.log(`${insertResult.insertedCount} new records inserted`);

                // Update the lastProcessedBlock to the current block number
                lastProcessedBlock = currentBlockNumber;
                await metadataCollection.updateOne({}, { $set: { lastProcessedBlock } }, { upsert: true });
                console.log('lastProcessedBlock updated:', lastProcessedBlock);

            } else {
                console.log('No new records to insert.');
            }

            isProcessing = false;

            console.log('Processing completed successfully');

        } catch (error) {
            console.error('Error:', error);
        } finally {
            client.close();
            console.log('MongoDB connection closed');
        }
    } catch (error) {
        console.error('Error:', error);
        // Đảm bảo rằng biến isProcessing được thiết lập lại thành false nếu có lỗi xảy ra
        isProcessing = false;
    }
}

async function getNftAndTokenName(dmlAddress) {
    try {

        const contractDml = new web3.eth.Contract(abiDml, dmlAddress);

        const tokenId = await contractDml.methods.id().call();
        const contractAddressToken = await contractDml.methods.tokenerc().call();
        const contractAddressNFT = await contractDml.methods.tokennft().call();

        const tokenName = await getTokenName(contractAddressToken);
        const nftName = await getNftName(tokenId, contractAddressNFT);

        return {
            tokenId,
            tokenName,
            nftName,
        };
    } catch (error) {
        console.error(error);
    }
}

async function getTokenName(contractAddressToken) {
    try {
        const contractToken = new web3.eth.Contract(abiDml, contractAddressToken);

        const tokenName = await contractToken.methods.name().call();
        console.log('Token Name: ', tokenName);

        return tokenName;
    } catch (error) {
        console.error(error);
    }
}

async function getNftName(tokenId, contractAddressNFT) {
    try {

        const contractNft = new web3.eth.Contract(abiNft, contractAddressNFT);
        const tokenURI = await contractNft.methods.uri(tokenId).call();
        console.log('Token URIss:', tokenURI);

        let nftName = await getTokenMetadata(tokenURI);
        if (nftName !== null && nftName !== '') {
            console.log('nftName:', nftName);
            return nftName;
        } else {
            return nftName = `{${contractAddressNFT}}:{${tokenId}}`;
        }

    } catch (error) {
        console.error(error);
    }
}

async function getTokenMetadata(tokenURI) {
    try {
        const response = await axios.get(tokenURI);
        const nftName = response.data.name;
        return nftName;
    } catch (error) {
        console.error('Error retrieving NFT name:', error);
        return null;
    }
}


querySubgraph();


app.get('/transaction-list', async (req, res) => {
    try {
        await client.connect();
        const collection = client.db(process.env.DATABASE_NAME).collection(process.env.COLLECTION_NAME);

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Fetch data and sort by blockTime in descending order
        const data = await collection
            .find()
            .sort({ blockTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Extract the required fields and format the response
        const formattedData = data.map((record) => {
            const { action, amountnft, amounterc, sender, blockTime, transactionHash } = record;

            // Convert blockTime to relative time
            const blockTimeRelative = moment.unix(blockTime).fromNow();

            // Generate the link for the action value
            const actionLink = `https://mumbai.polygonscan.com/tx/${transactionHash}`;

            return {
                action: {
                    value: action,
                    link: actionLink,
                },
                amountnft,
                amounterc,
                sender,
                blockTime: blockTimeRelative,
            };
        });

        // Calculate total pages
        const count = await collection.countDocuments();
        const totalPages = Math.ceil(count / limit);

        // Check if there is a next page
        const hasNextPage = skip + limit < count;

        // Check if there is a previous page
        const hasPreviousPage = page > 1;

        // Generate links for next and previous pages
        const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
        const nextUrl = hasNextPage ? `${baseUrl}?page=${page + 1}` : null;
        const prevUrl = hasPreviousPage ? `${baseUrl}?page=${page - 1}` : null;

        res.json({
            data: formattedData,
            totalPages,
            currentPage: page,
            hasNextPage,
            hasPreviousPage,
            totalRecords: count,
            nextPage: nextUrl,
            previousPage: prevUrl,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    } finally {
        client.close();
    }
});

setInterval(querySubgraph, 1000);

app.listen(port, () => {
    console.log(`API server is running on port ${port}`);
});



