// mongodbService.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const client = new MongoClient(uri);

async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

function getClient() {
    return client;
}

module.exports = { connect, getClient };
