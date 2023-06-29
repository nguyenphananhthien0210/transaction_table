const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 6000;
const uri = process.env.CONNECTED_MONGODB_URI;
const DATA_DATABASE = process.env.DATABASE_TEST;
const COLLECTION = process.env.COLLECTION;
const DML_COLLECTION = process.env.DML_COLLECTION;

const app = express();

app.get('/liquidity-list', async (req, res) => {
    const userAddress = req.query.userAddress;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(DATA_DATABASE);
        const collection = db.collection(COLLECTION);
        const infoCollection = db.collection(DML_COLLECTION);

        await collection.createIndex({ to: 1 });

        const filter = {
            to: userAddress
        };

        const projection = {
            _id: 0,
            dml: 1
        };

        const dmls = await collection.find(filter).project(projection).toArray();

        const uniqueDmls = new Set();

        const filteredDmls = dmls.filter((record) => {
            if (uniqueDmls.has(record.dml)) {
                return false;
            } else {
                uniqueDmls.add(record.dml);
                return true;
            }
        });

        const dmlValues = filteredDmls.map((record) => record.dml);

        const infoFilter = {
            dmlToken: { $in: dmlValues }
        };

        await infoCollection.createIndex({ dmlToken: 1 });
        await infoCollection.createIndex({ dmlToken: 1, nft: 1, erc: 1 });


        const infoProjection = {
            _id: 0,
            dmlToken: 1,
            nft: 1,
            erc: 1
        };

        const infoRecords = await infoCollection.find(infoFilter).project(infoProjection).toArray();

        res.json(infoRecords);

        client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
