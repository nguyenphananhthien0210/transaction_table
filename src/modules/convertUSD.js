
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const databaseName = process.env.WORKER_DATA_DATABASE;
const collectionName = process.env.RATE_PRICE;
const client = new MongoClient(uri);


async function getRatePrice(symbol) {
    try {
        await client.connect();
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        const result = await collection.findOne();

        if (result && result[symbol]) {
            return result[symbol];
        } else {
            return 0.5;
        }

    } catch (error) {
        console.error(error);
        return 'Error occurred';
    }
}

module.exports = {
    getRatePrice
};