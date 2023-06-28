
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const shuffleArray = require('shuffle-array');

const app = express();

const port = process.env.PORT || 3000;
const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

let pageSize = 10;
let startIndex = 0;
let allRecords = [];

app.get('/api/homepage', async (req, res) => {
    try {
        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);

        if (allRecords.length === 0) {
            allRecords = await collection.find().toArray();
            shuffleArray(allRecords);
        }

        const records = allRecords.slice(startIndex, startIndex + pageSize);
        startIndex += pageSize;

        res.json({
            records,
            totalPage: Math.ceil(allRecords.length / pageSize),
            currentPage: Math.ceil(startIndex / pageSize),
            totalRecords: allRecords.length,
            nextPage: startIndex < allRecords.length,
        });

        await client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


