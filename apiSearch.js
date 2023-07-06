const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 3000;
const uri = process.env.CONNECTED_MONGODB_URI;
const DATA_DATABASE = process.env.DATABASE_TEST;
const DML_COLLECTION = process.env.DML_COLLECTION;
const NFT_COLLECTION = process.env.COLLECTION_HOMEPAGE;

const app = express();

app.get('/search', async (req, res) => {
    const queryAddress = req.query.address;
    const queryNFTName = req.query.nftName;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(DATA_DATABASE);
        const dmlCollection = db.collection(DML_COLLECTION);
        const nftCollection = db('HomePage').collection(NFT_COLLECTION);


        const filter = {
            $or: [
                { nft: queryAddress },
                { erc: queryAddress },
                { transactionHash: { $regex: `.*${queryNFTName}.*`, $options: 'i' } }
            ]
        };

        const dmls = await dmlCollection.find(filter).toArray();

        res.json(dmls);

        client.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
