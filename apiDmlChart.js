
//Hiện ngày + giờ phút giây
// const express = require('express');
// const { MongoClient } = require('mongodb');
// const moment = require('moment');
// const app = express();
// require('dotenv').config();

// const uri = process.env.CONNECTED_MONGODB_URI;
// const dbName = process.env.COLLECTION_DATA_DATABASE;
// const collectionName = 'makeTransactionsCollection';

// app.get('/api/dml-chart/:dml?', async (req, res) => {
//     try {
//         const dml = req.params.dml;

//         const client = await MongoClient.connect(uri);
//         const db = client.db(dbName);
//         const collection = db.collection(collectionName);

//         const data = await collection.find().toArray();

//         const uniqueDates = [...new Set(data.map((item) => formatDate(item.blockTime)))];

//         const summary = {};

//         uniqueDates.forEach((date) => {
//             const targetDate = moment(date, 'YYYY-MM-DD');
//             const summaryByDml = {};

//             data.forEach((item) => {
//                 const itemDate = moment.unix(item.blockTime);
//                 if (
//                     itemDate.isSame(targetDate, 'day') &&
//                     (!dml || item.dml === dml)
//                 ) {
//                     const dmlValue = item.dml;
//                     if (!summaryByDml[dmlValue]) {
//                         summaryByDml[dmlValue] = {
//                             dml: dmlValue,
//                             totalVolume: 0,
//                             totalPrice: 0,
//                         };
//                     }
//                     summaryByDml[dmlValue].totalVolume += item.volume;
//                     summaryByDml[dmlValue].totalPrice += item.price;
//                 }
//             });

//             Object.values(summaryByDml).forEach((dmlSummary) => {
//                 if (!summary[dmlSummary.dml]) {
//                     summary[dmlSummary.dml] = [];
//                 }
//                 summary[dmlSummary.dml].push({
//                     date: targetDate.format(),
//                     totalVolume: dmlSummary.totalVolume,
//                     totalPrice: dmlSummary.totalPrice,
//                 });
//             });
//         });

//         res.json(summary);

//         client.close();
//     } catch (error) {
//         console.error('Error retrieving data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// function formatDate(timestamp) {
//     return moment.unix(timestamp).format('YYYY-MM-DD');
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });


//Hiện chỉ ngày tháng năm
// const express = require('express');
// const { MongoClient } = require('mongodb');
// const moment = require('moment');
// const app = express();
// require('dotenv').config();

// const uri = process.env.CONNECTED_MONGODB_URI;
// const dbName = process.env.DATABASE_TEST;
// const collectionName1 = 'makeTransactionsCollection';
// const collectionName2 = 'makeLiquiditiesCollection';

// app.get('/api/dml-chart/:dml?', async (req, res) => {
//     try {
//         const dml = req.params.dml;

//         const client = await MongoClient.connect(uri);
//         const db = client.db(dbName);
//         const collection1 = db.collection(collectionName1);
//         const collection2 = db.collection(collectionName2);

//         const data1 = await collection1.find().toArray();
//         const data2 = await collection2.find().toArray();

//         const uniqueDates = [...new Set(data1.map((item) => formatDate(item.blockTime)))];

//         const summary = {};

//         uniqueDates.forEach((date) => {
//             const targetDate = moment(date, 'YYYY-MM-DD');
//             const summaryByDml = {};

//             data.forEach((item) => {
//                 const itemDate = moment.unix(item.blockTime);
//                 if (
//                     itemDate.isSame(targetDate, 'day') &&
//                     (!dml || item.dml === dml)
//                 ) {
//                     const dmlValue = item.dml;
//                     if (!summaryByDml[dmlValue]) {
//                         summaryByDml[dmlValue] = {
//                             dml: dmlValue,
//                             totalVolume: 0,
//                             totalPrice: 0,
//                         };
//                     }
//                     summaryByDml[dmlValue].totalVolume += item.volumeInUSD;
//                     summaryByDml[dmlValue].totalPrice += item.priceInUSD;
//                 }
//             });

//             Object.values(summaryByDml).forEach((dmlSummary) => {
//                 if (!summary[dmlSummary.dml]) {
//                     summary[dmlSummary.dml] = [];
//                 }
//                 summary[dmlSummary.dml].push({
//                     date: targetDate.toISOString().split('T')[0],
//                     totalVolume: dmlSummary.totalVolume,
//                     totalPrice: dmlSummary.totalPrice,
//                 });
//             });
//         });

//         res.json(summary);

//         client.close();
//     } catch (error) {
//         console.error('Error retrieving data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// function formatDate(timestamp) {
//     return moment.unix(timestamp).format('YYYY-MM-DD');
// }

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });


const express = require('express');
const { MongoClient } = require('mongodb');
const moment = require('moment');
const app = express();
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const dbName = process.env.DATABASE_TEST;
const collectionName1 = 'makeTransactionsCollection';
const collectionName2 = 'makeLiquiditiesCollection';

app.get('/api/dml-chart/:dml?', async (req, res) => {
    try {
        const dml = req.params.dml;

        const client = await MongoClient.connect(uri);
        const db = client.db(dbName);
        const collection1 = db.collection(collectionName1);
        const collection2 = db.collection(collectionName2);

        const data1 = await collection1.find().toArray();
        const data2 = await collection2.find().toArray();

        const data1Dates = data1.map((item) => formatDate(item.blockTime));
        const data2Dates = data2.map((item) => formatDate(item.blockTime));
        const allDates = [...new Set([...data1Dates, ...data2Dates])];
        const uniqueDates = allDates.sort();

        const summary = {};

        uniqueDates.forEach((date) => {
            const targetDate = moment(date, 'YYYY-MM-DD');
            const summaryByDml = {};

            data1.forEach((item) => {
                const itemDate = moment.unix(item.blockTime);
                if (itemDate.isSame(targetDate, 'day') && (!dml || item.dml === dml)) {
                    const dmlValue = item.dml;
                    if (!summaryByDml[dmlValue]) {
                        summaryByDml[dmlValue] = {
                            dml: dmlValue,
                            totalVolume: 0,
                            totalCount: 0,
                            totalPrice: 0,
                        };
                    }
                    summaryByDml[dmlValue].totalVolume += parseInt(item.amounttoken);
                    summaryByDml[dmlValue].totalCount++;
                    summaryByDml[dmlValue].totalPrice += parseInt(item.price);
                }
            });

            data2.forEach((item) => {
                const itemDate = moment.unix(item.blockTime);
                if (itemDate.isSame(targetDate, 'day') && (!dml || item.dml === dml)) {
                    const dmlValue = item.dml;
                    if (!summaryByDml[dmlValue]) {
                        summaryByDml[dmlValue] = {
                            dml: dmlValue,
                            totalVolume: 0,
                            totalCount: 0,
                        };
                    }
                    summaryByDml[dmlValue].totalVolume += parseInt(item.amounttoken);
                }
            });

            Object.values(summaryByDml).forEach((dmlSummary) => {
                if (!summary[dmlSummary.dml]) {
                    summary[dmlSummary.dml] = [];
                }
                const averagePrice = dmlSummary.totalCount > 0 ? dmlSummary.totalPrice / dmlSummary.totalCount : 0;
                summary[dmlSummary.dml].push({
                    date: targetDate.toISOString().split('T')[0],
                    totalVolume: dmlSummary.totalVolume,
                    averagePrice: averagePrice,
                });
            });
        });

        res.json(summary);

        client.close();
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function formatDate(timestamp) {
    return moment.unix(timestamp).format('YYYY-MM-DD');
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});




