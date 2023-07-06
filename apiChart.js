
//     const data1 = [
//         {
//             "blockTime": 1625059200,
//             "amounttoken": 1000,
//             "tvlInUSD": 5000
//         },
//         {
//             "blockTime": 1625059200,
//             "amounttoken": 2000,
//             "tvlInUSD": 5000
//         },
//         {
//             "blockTime": 1625145600,
//             "amounttoken": 2000,
//             "tvlInUSD": 6000
//         },
//         {
//             "blockTime": 1625404800,
//             "amounttoken": 5000,
//             "tvlInUSD": 9000
//         },
//         {
//             "blockTime": 1625232000,
//             "amounttoken": 3000,
//             "tvlInUSD": 7000
//         },
//         {
//             "blockTime": 1625232000,
//             "amounttoken": 2000,
//             "tvlInUSD": 7000
//         }
//     ];

//     const data2 = [
//         {
//             "blockTime": 1625318400,
//             "amounttoken": 4000,
//             "tvlInUSD": 8000
//         },
//         {
//             "blockTime": 1625404800,
//             "amounttoken": 5000,
//             "tvlInUSD": 9000
//         },
//         {
//             "blockTime": 1625232000,
//             "amounttoken": 2000,
//             "tvlInUSD": 7000
//         },
//         {
//             "blockTime": 1625491200,
//             "amounttoken": 6000,
//             "tvlInUSD": 10000
//         }
//     ];




const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const dbName = process.env.WORKER_DATA_DATABASE;
const MAKETRANSACTIONS_COLLECTION = process.env.MAKETRANSACTIONS_COLLECTION;
const MAKELIQUIDITIES_COLLECTION = process.env.MAKELIQUIDITIES_COLLECTION;

app.get('/chart', async (req, res) => {
    try {
        const { startDate } = req.query;

        const currentTimestamp = Math.floor(Date.now() / 1000);
        console.log(currentTimestamp)

        const startTimestamp = currentTimestamp - parseInt(startDate) * 24 * 60 * 60;
        console.log(startTimestamp)

        const client = await MongoClient.connect(uri);
        const db = client.db(dbName);
        const makeTransactionsCollection = db.collection(MAKETRANSACTIONS_COLLECTION);
        const makeLiquiditiesCollection = db.collection(MAKELIQUIDITIES_COLLECTION);

        const makeTransactionsData = await makeTransactionsCollection.find({
            blockTime: {
                $gte: startTimestamp.toString(),
                $lte: currentTimestamp.toString()
            }
        },
            {
                projection: {
                    blockTime: 1,
                    dml: 1,
                    amountnft: 1
                }
            }).toArray();
        console.log(makeTransactionsData);

        const makeLiquiditiesData = await makeLiquiditiesCollection.find({
            blockTime: {
                $gte: startTimestamp.toString(),
                $lte: currentTimestamp.toString()
            }
        },
            {
                projection: {
                    blockTime: 1,
                    dml: 1,
                    amountnft: 1
                }
            }).toArray();
        console.log(makeLiquiditiesData);

        const summary = calculateSummary(makeTransactionsData, makeLiquiditiesData);

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

function calculateSummary(makeTransactionsData, makeLiquiditiesData) {
    const combinedData = [...makeTransactionsData, ...makeLiquiditiesData];

    const summary = {};

    combinedData.forEach((item) => {
        const date = formatDate(item.blockTime);
        const dml = item.dml;
        const amountnft = parseInt(item.amountnft);

        if (!summary[date]) {
            summary[date] = { volume: 0, tvl: {} };
        }

        summary[date].volume += amountnft;

        // Lưu giá trị amountnft cuối cùng của ngày đó cho mỗi dml
        summary[date].tvl[dml] = amountnft;
    });

    // Tính tổng amountnft cuối cùng của các dml khác nhau trong cùng một ngày
    Object.keys(summary).forEach((date) => {
        const dmls = Object.keys(summary[date].tvl);
        const totalTvl = dmls.reduce((total, dml) => total + summary[date].tvl[dml], 0);
        summary[date].tvlTotal = totalTvl;
    });

    return summary;
}


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

