
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
let currentPage = 1;
let allRecords = [];
let remainingRecords = [];

app.get('/api/homepage', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || currentPage;

        if (page !== currentPage) {
            currentPage = page;
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            remainingRecords = allRecords.slice(startIndex, endIndex);
        }

        if (remainingRecords.length === 0) {
            const client = new MongoClient(URI);
            await client.connect();
            const db = client.db(DATABASE_HOMEPAGE);
            allRecords = await db.collection(COLLECTION_HOMEPAGE).find().toArray();
            shuffleArray(allRecords);
            await client.close();

            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            remainingRecords = allRecords.slice(startIndex, endIndex);
        }

        res.json({
            records: remainingRecords,
            totalPage: Math.ceil(allRecords.length / pageSize),
            currentPage,
            totalRecords: allRecords.length,
            nextPage: (currentPage * pageSize) < allRecords.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
