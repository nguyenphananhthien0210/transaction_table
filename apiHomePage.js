/*
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 4000;

const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

const PAGE_SIZE = 10;
let currentPage = 0;
let totalPageCount = 0;
let fetchedRecords = new Set(); // Set to store the fetched record indices

app.get('/api/homepage', async (req, res) => {
    try {
        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);

        if (currentPage === 0) {
            // On the first request, retrieve the total page count
            const documentCount = await collection.countDocuments();
            totalPageCount = Math.ceil(documentCount / PAGE_SIZE);
        }

        let recordsToReturn = [];

        if (fetchedRecords.size < PAGE_SIZE) {
            // Fetch initial set of records if fetchedRecords set is not yet filled
            const randomPage = generateRandomPage();
            const skipCount = randomPage * PAGE_SIZE;
            const query = {};
            recordsToReturn = await collection.find(query).skip(skipCount).limit(PAGE_SIZE).toArray();

            // Add the indices of fetched records to the fetchedRecords set
            recordsToReturn.forEach((record, index) => {
                fetchedRecords.add(skipCount + index);
            });
        } else {
            // If fetchedRecords set is already filled, return next set of unique records
            const remainingRecords = Array.from(fetchedRecords);

            // Fetch the next set of records that are not in the fetchedRecords set
            const query = { _id: { $nin: remainingRecords } };
            recordsToReturn = await collection.find(query).limit(PAGE_SIZE).toArray();

            // Add the indices of newly fetched records to the fetchedRecords set
            recordsToReturn.forEach((record) => {
                fetchedRecords.add(record._id);
            });

            // Remove the indices of records that have been returned from the fetchedRecords set
            recordsToReturn.forEach((record) => {
                fetchedRecords.delete(record._id);
            });
        }

        res.json(recordsToReturn);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function generateRandomPage() {
    return Math.floor(Math.random() * totalPageCount);
}

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
*/
/*
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

// Lưu trữ danh sách bản ghi đã lấy từ cơ sở dữ liệu
let records = [];

app.get('/api/records', async (req, res) => {
    try {
        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);

        // Kiểm tra xem danh sách bản ghi đã hết hay chưa
        if (records.length === 0) {
            // Lấy 10 bản ghi ngẫu nhiên từ cơ sở dữ liệu
            records = await collection.aggregate([{ $sample: { size: 10 } }]).toArray();
        }

        // Lấy 10 bản ghi tiếp theo từ danh sách và xóa chúng khỏi danh sách
        const nextRecords = records.splice(0, 10);

        res.json(nextRecords);

        await client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const port = 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
*/

/*
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

// Lưu trữ trạng thái hiện tại
let currentPage = 0;
let pageSize = 10;
let totalPages = 0;
let totalRecords = 0;
let allRecords = [];

app.get('/api/records', async (req, res) => {
    try {
        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);

        // Đếm tổng số bản ghi
        if (totalRecords === 0) {
            totalRecords = await collection.countDocuments();
            totalPages = Math.ceil(totalRecords / pageSize);
        }

        // Kiểm tra xem trang hiện tại đã đạt tới trang cuối cùng hay chưa
        if (currentPage >= totalPages) {
            res.json([]);
            return;
        }

        // Lấy bản ghi cho trang hiện tại nếu chưa có trong danh sách tất cả các bản ghi
        if (allRecords.length === 0 || allRecords.length < totalRecords) {
            const newRecords = await collection.find().toArray();
            allRecords = allRecords.concat(newRecords);
        }

        // Lấy 10 bản ghi tiếp theo từ danh sách tất cả các bản ghi
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        const records = allRecords.slice(startIndex, endIndex);

        // Cập nhật trang hiện tại
        currentPage++;

        res.json(records);

        await client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
*/

const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

const URI = process.env.CONNECTED_MONGODB_URI;
const DATABASE_HOMEPAGE = process.env.DATABASE_HOMEPAGE;
const COLLECTION_HOMEPAGE = process.env.COLLECTION_HOMEPAGE;

let currentPage = 0;
let pageSize = 10;
let totalPages = 0;
let totalRecords = 0;
let allRecords = [];

app.get('/api/homepage', async (req, res) => {
    try {
        const client = new MongoClient(URI);
        await client.connect();
        const db = client.db(DATABASE_HOMEPAGE);
        const collection = db.collection(COLLECTION_HOMEPAGE);

        if (totalRecords === 0) {
            totalRecords = await collection.countDocuments();
            totalPages = Math.ceil(totalRecords / pageSize);
        }

        let records = [];

        if (currentPage === 0) {
            records = await collection.aggregate([{ $sample: { size: pageSize } }]).toArray();
            allRecords = records;
        } else if (currentPage < totalPages) {
            records = await collection.aggregate([{ $sample: { size: pageSize } }]).toArray();
            allRecords = allRecords.concat(records);
        }

        currentPage++;

        res.json(records);

        await client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

