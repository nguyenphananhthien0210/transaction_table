// const express = require('express');
// const app = express();

// const data = [
//     { blockTime: 1687164773, volume: 100, price: 10, tvl: 1000 },
//     { blockTime: 1687164773, volume: 200, price: 15, tvl: 1500 },
//     { blockTime: 1687244773, volume: 150, price: 12, tvl: 1200 },
//     { blockTime: 1687244773, volume: 250, price: 20, tvl: 2000 },
//     { blockTime: 1687344773, volume: 250, price: 20, tvl: 2000 },
//     { blockTime: 1687344773, volume: 250, price: 20, tvl: 2000 },
//     { blockTime: 1687644773, volume: 250, price: 20, tvl: 2000 },
// ];

// app.get('/api/summary', (req, res) => {
//     const uniqueDates = [...new Set(data.map((item) => formatDate(item.blockTime)))];

//     const summary = uniqueDates.map((date) => {
//         const targetDate = new Date(date);

//         const filteredData = data.filter((item) => {
//             const itemDate = new Date(item.blockTime * 1000);
//             return (
//                 itemDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
//                 itemDate.getUTCMonth() === targetDate.getUTCMonth() &&
//                 itemDate.getUTCDate() === targetDate.getUTCDate()
//             );
//         });

//         const totalVolume = filteredData.reduce((sum, item) => sum + item.volume, 0);
//         const totalPrice = filteredData.reduce((sum, item) => sum + item.price, 0);
//         const totalTvl = filteredData.reduce((sum, item) => sum + item.tvl, 0);

//         return {
//             date: targetDate,
//             totalVolume,
//             totalPrice,
//             totalTvl,
//         };
//     });

//     res.json(summary);
// });

// function formatDate(timestamp) {
//     const date = new Date(timestamp * 1000);
//     return date.toISOString().split('T')[0];
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });



// const express = require('express');
// const { MongoClient } = require('mongodb');
// const app = express();
// require('dotenv').config();

// const uri = process.env.CONNECTED_MONGODB_URI
// const dbName = process.env.COLLECTION_DATA_DATABASE
// const collectionName = process.env.COLLECTION_MAKETRANSACTIONS;


// app.get('/api/chart', async (req, res) => {
//     try {
//         const client = await MongoClient.connect(uri);
//         const db = client.db(dbName);
//         const collection = db.collection(collectionName);

//         const data = await collection.find().toArray();

//         const uniqueDates = [...new Set(data.map((item) => formatDate(item.blockTime)))];

//         const summary = uniqueDates.map((date) => {
//             const targetDate = new Date(date);

//             const filteredData = data.filter((item) => {
//                 const itemDate = new Date(item.blockTime * 1000);
//                 return (
//                     itemDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
//                     itemDate.getUTCMonth() === targetDate.getUTCMonth() &&
//                     itemDate.getUTCDate() === targetDate.getUTCDate()
//                 );
//             });

//             const totalVolume = filteredData.reduce((sum, item) => sum + item.volumeInUSD, 0);
//             //const totalPrice = filteredData.reduce((sum, item) => sum + item.priceInUSD, 0);
//             const totalTvl = filteredData.reduce((sum, item) => sum + item.tvlInUSD, 0);

//             return {
//                 date: targetDate,
//                 totalVolume,
//                 //totalPrice,
//                 totalTvl,
//             };
//         });

//         res.json(summary);

//         client.close();
//     } catch (error) {
//         console.error('Error retrieving data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// function formatDate(timestamp) {
//     const date = new Date(timestamp * 1000);
//     return date.toISOString().split('T')[0];
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });


// const express = require('express');
// const app = express();

// app.get('/api/chart', (req, res) => {
//     const data1 = [
//         {
//             "blockTime": 1625059200,
//             "volumeInUSD": 1000,
//             "tvlInUSD": 5000
//         },
//         {
//             "blockTime": 1625059200,
//             "volumeInUSD": 2000,
//             "tvlInUSD": 5000
//         },
//         {
//             "blockTime": 1625145600,
//             "volumeInUSD": 2000,
//             "tvlInUSD": 6000
//         },
//         {
//             "blockTime": 1625404800,
//             "volumeInUSD": 5000,
//             "tvlInUSD": 9000
//         },
//         {
//             "blockTime": 1625232000,
//             "volumeInUSD": 3000,
//             "tvlInUSD": 7000
//         },
//         {
//             "blockTime": 1625232000,
//             "volumeInUSD": 2000,
//             "tvlInUSD": 7000
//         }
//     ];

//     const data2 = [
//         {
//             "blockTime": 1625318400,
//             "volumeInUSD": 4000,
//             "tvlInUSD": 8000
//         },
//         {
//             "blockTime": 1625404800,
//             "volumeInUSD": 5000,
//             "tvlInUSD": 9000
//         },
//         {
//             "blockTime": 1625232000,
//             "volumeInUSD": 2000,
//             "tvlInUSD": 7000
//         },
//         {
//             "blockTime": 1625491200,
//             "volumeInUSD": 6000,
//             "tvlInUSD": 10000
//         }
//     ];

//     const combinedData = [...data1, ...data2];

//     const uniqueDates = [...new Set(combinedData.map((item) => formatDate(item.blockTime)))];

//     const summary = uniqueDates.map((date) => {
//         const targetDate = new Date(date);

//         const filteredData = combinedData.filter((item) => {
//             const itemDate = new Date(item.blockTime * 1000);
//             return (
//                 itemDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
//                 itemDate.getUTCMonth() === targetDate.getUTCMonth() &&
//                 itemDate.getUTCDate() === targetDate.getUTCDate()
//             );
//         });

//         const totalVolume = filteredData.reduce((sum, item) => sum + item.volumeInUSD, 0);
//         //const totalPrice = filteredData.reduce((sum, item) => sum + item.priceInUSD, 0);
//         const totalTvl = filteredData.reduce((sum, item) => sum + item.tvlInUSD, 0);

//         return {
//             date: targetDate,
//             totalVolume,
//             //totalPrice,
//             totalTvl,
//         };
//     });

//     res.json(summary);
// });

// function formatDate(timestamp) {
//     const date = new Date(timestamp * 1000);
//     return date.toISOString().split('T')[0];
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });


// const express = require('express');
// const { MongoClient } = require('mongodb');
// const app = express();
// require('dotenv').config();

// const uri = process.env.CONNECTED_MONGODB_URI;
// const dbName = process.env.DATABASE_TEST;
// const collectionName1 = 'makeTransactionsCollection'
// const collectionName2 = 'makeLiquiditiesCollection'

// app.get('/api/chart', async (req, res) => {
//     try {
//         const client = await MongoClient.connect(uri);
//         const db = client.db(dbName);
//         const collection1 = db.collection(collectionName1);
//         const collection2 = db.collection(collectionName2);

//         const data1 = await collection1.find().toArray();

//         const data2 = await collection2.find().toArray();

//         const data = [...data1, ...data2];

//         const summary = calculateSummary(data);

//         res.json(summary);

//         client.close();
//     } catch (error) {
//         console.error('Error retrieving data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// function formatDate(timestamp) {
//     const date = new Date(timestamp * 1000);
//     return date.toISOString().split('T')[0];
// }

// function calculateSummary(data) {
//     const summary = {};
//     const uniqueDates = [...new Set(data.map((item) => formatDate(item.blockTime)))];

//     uniqueDates.forEach((date) => {
//         const targetDate = new Date(date);

//         const filteredData = data.filter((item) => {
//             const itemDate = new Date(item.blockTime * 1000);
//             return (
//                 itemDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
//                 itemDate.getUTCMonth() === targetDate.getUTCMonth() &&
//                 itemDate.getUTCDate() === targetDate.getUTCDate()
//             );
//         });

//         if (filteredData.length > 0) {
//             const totalVolume = filteredData.reduce((sum, item) => sum + item.volumeInUSD, 0);
//             const lastIndex = filteredData.length - 1;
//             const lastItem = filteredData[lastIndex];
//             summary[date] = {
//                 totalVolume,
//                 totalTvl: lastItem.tvlInUSD,
//             };
//         } else {
//             summary[date] = {
//                 totalVolume: 0,
//                 totalTvl: 0,
//             };
//         }
//     });

//     return summary;
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });



const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const dbName = process.env.DATABASE_TEST;
const collectionName1 = 'makeTransactionsCollection';
const collectionName2 = 'makeLiquiditiesCollection';

app.get('/api/chart', async (req, res) => {
    try {
        const client = await MongoClient.connect(uri);
        const db = client.db(dbName);
        const collection1 = db.collection(collectionName1);
        const collection2 = db.collection(collectionName2);

        const data1 = await collection1.find().toArray();
        const data2 = await collection2.find().toArray();

        const summary = calculateSummary(data1, data2);

        res.json(summary);

        client.close();
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0];
}

function calculateSummary(data1, data2) {
    const summary = {};

    data1.forEach((item) => {
        const date = formatDate(item.blockTime);
        if (!summary[date]) {
            summary[date] = { totalVolume: 0, totalTvl: 0 };
        }
        summary[date].totalVolume += item.volumeInUSD;
        summary[date].totalTvl = item.tvlInUSD;
    });

    data2.forEach((item) => {
        const date = formatDate(item.blockTime);
        if (!summary[date]) {
            summary[date] = { totalVolume: 0, totalTvl: 0 };
        }
        summary[date].totalVolume += item.volumeInUSD;
    });

    return summary;
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

