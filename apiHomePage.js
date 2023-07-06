
// const express = require('express');
// const { MongoClient } = require('mongodb');
// require('dotenv').config();

// const app = express();

// const port = 3001;
// const URI = process.env.CONNECTED_MONGODB_URI;
// const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
// const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     next();
// });

// let existingRecords = [];

// app.get('/api/homepage', async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 10;

//         if (page === 1) {
//             existingRecords = [];
//         }

//         const client = new MongoClient(URI);
//         await client.connect();
//         const db = client.db(DATABASE_HOMEPAGE);

//         const collection = db.collection(COLLECTION_HOMEPAGE);

//         const randomRecords = await collection.aggregate([
//             { $match: { _id: { $nin: existingRecords } } },
//             { $sample: { size: limit } }
//         ]).toArray();

//         const uniqueRecords = randomRecords.filter(record => !existingRecords.includes(record._id));

//         existingRecords = existingRecords.concat(uniqueRecords.map(record => record._id));

//         res.json(uniqueRecords);

//         await client.close();
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });


const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

const port = 3001;
const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

let existingRecords = [];

app.get('/api/homepage', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        if (page === 1) {
            existingRecords = [];
        }

        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);

        const collection = db.collection(COLLECTION_HOMEPAGE);

        const totalRecords = await collection.countDocuments();
        const totalPages = Math.ceil(totalRecords / limit);

        let randomRecords = [];
        let pageRecords = [];

        if (existingRecords.length < totalRecords) {
            const existingRecordIds = existingRecords.map(record => record.dmlAddress);

            randomRecords = await collection.aggregate([
                { $match: { dmlAddress: { $nin: existingRecordIds } } },
                { $sample: { size: limit } }
            ]).toArray();

            existingRecords.push(...randomRecords);
        }

        pageRecords = existingRecords.slice((page - 1) * limit, page * limit);

        const hasNextPage = page < totalPages;

        const response = {
            totalRecords,
            currentPage: page,
            totalPage: totalPages,
            hasNextPage,
            records: pageRecords
        };

        res.json(response);

        await client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

