const express = require('express');
const { MongoClient } = require('mongodb');
const moment = require('moment');

require('dotenv').config();

const app = express();

const port = process.env.PORT || 3000;
const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_TEST = process.env.DATABASE_TEST;
const TRANSACTIONS_COLLECTION = process.env.TRANSACTIONS_COLLECTION;

const client = new MongoClient(URI);

app.get('/transaction-list', async (req, res) => {
    try {
        await client.connect();
        const collection = client.db(DATABASE_TEST).collection(TRANSACTIONS_COLLECTION);

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const data = await collection
            .find()
            .sort({ blockTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const otherCollection = client.db(DATABASE_TEST).collection('dmlList');
        const additionalData = await otherCollection.find({ dmlToken: { $in: data.map(record => record.dml) } }).toArray();

        const otherCollection2 = client.db('HomePage').collection('metadataList');
        const additionalData2 = await otherCollection2.find({ dmlAddress: { $in: data.map(record => record.dml) } }).toArray();

        const mergedData = data.map(record => {
            const additionalRecord = additionalData.find(item => item.dmlToken === record.dml);
            const tokenName = additionalRecord ? additionalRecord.tokenName : null;

            const additionalRecord2 = additionalData2.find(item => item.dmlAddress === record.dml);
            const nftName = additionalRecord2 ? additionalRecord2.metadata.name : null;

            return {
                ...record,
                tokenName: tokenName,
                nftName: nftName
            };
        });

        const formattedData = mergedData.map((record) => {
            const { action, amountnft, amounttoken, sender, blockTime, transactionHash, tokenName, nftName } = record;

            const blockTimeRelative = moment.unix(blockTime).fromNow();

            const actionName = `${action} ${nftName} from ${tokenName}`

            const actionLink = `https://mumbai.polygonscan.com/tx/${transactionHash}`;

            return {
                action: {
                    actionName: actionName,
                    link: actionLink,
                },
                amountnft,
                amounttoken,
                sender,
                blockTime: blockTimeRelative,
            };
        });

        const count = await collection.countDocuments();
        const totalPages = Math.ceil(count / limit);

        const hasNextPage = skip + limit < count;

        const hasPreviousPage = page > 1;

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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
