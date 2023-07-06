const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const port = 4002;
const uri = process.env.CONNECTED_MONGODB_URI;
const DATA_DATABASE = process.env.DATABASE_HOMEPAGE;
const DML_COLLECTION = process.env.COLLECTION_HOMEPAGE;

const app = express();

app.get('/api/items/:category', async (req, res) => {
    const category = req.params.category;
    let categoryFilter = {};

    const defaultCategories = ['Gaming', 'Music', 'Film', 'Art', 'Memberships'];
    if (defaultCategories.includes(category)) {
        categoryFilter = { 'metadata.category': category };
    } else {
        categoryFilter = {
            $or: [
                { 'metadata.category': 'Other' },
                { 'metadata.category': { $nin: defaultCategories } }
            ]
        };
    }

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(DATA_DATABASE);
        const dmlCollection = db.collection(DML_COLLECTION);

        dmlCollection.find(categoryFilter)
            .sort({ 'metadata.name': 1 })
            .toArray()
            .then((items) => {
                res.json(items);
            })
            .catch((error) => {
                console.error('Error retrieving items:', error);
                res.status(500).json({ error: 'Internal server error' });
            });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


