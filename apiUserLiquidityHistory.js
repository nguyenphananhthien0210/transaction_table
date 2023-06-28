//Cách 1: query data từ db makeLiquidities(có sắp xếp và phân page) -> lưu data đó vào collection historyLiquidity

/*
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const client = new MongoClient(uri);

const app = express();
const port = process.env.PORT || 4000;
const PAGE_SIZE = 8;

app.get('/api/liquidity-history', async (req, res) => {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(process.env.DATABASE_NAME);
        const collection = db.collection(process.env.COLLECTION_MAKELIQUIDITIES);

        const currentPage = parseInt(req.query.page) || 1;
        const totalRecords = await collection.countDocuments({});
        const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

        const hasNextPage = currentPage < totalPages;
        const hasPreviousPage = currentPage > 1;

        let skip = (currentPage - 1) * PAGE_SIZE;
        if (skip < 0) {
            skip = 0;
        }

        const data = await collection
            .find({}, { projection: { _id: 0, action: 1, liquidity: 1, amountnft: 1, amounttoken: 1, blockTime: 1 } })
            .sort({ blockTime: -1 })
            .skip(skip)
            .limit(PAGE_SIZE)
            .toArray();

        const historyLiquidityCollection = db.collection(process.env.HISTORY_LIQUIDITY_COLLECTION);

        await historyLiquidityCollection.insertMany(data);

        const response = {
            data,
            totalRecords,
            totalPages,
            currentPage,
            hasNextPage,
            hasPreviousPage
        };

        if (hasNextPage) {
            response.nextPage = `/api/liquidity-history?page=${currentPage + 1}`;
        }

        if (hasPreviousPage) {
            response.previousPage = `/api/liquidity-history?page=${currentPage - 1}`;
        }

        res.json(response);

    } catch (error) {
        console.error('Error fetching or saving data in MongoDB:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {

        await client.close();
        console.log('Disconnected from MongoDB');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

*/



/*
//Cách 2: Lấy data trực tiếp từ subgraph

const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 4000;
const PAGE_SIZE = 8;

app.get('/api/liquidity-history', async (req, res) => {
    try {
        const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

        const page = req.query.page || 1;
        const skip = (page - 1) * PAGE_SIZE;
        const first = PAGE_SIZE;
        const sender = req.query.sender;

        const query = `
        query {
            makeLiquidities(
                where: { sender: "${sender}" }
                orderBy: blockTime
                orderDirection: desc
                first: ${first}
                skip: ${skip}
            ) {
                action
                amountnft
                amounttoken
                blockNumber
                blockTime
                dml
                id
                liquidity
                sender
                to
                transactionHash
            }
        }
        `;

        const response = await axios.post(subgraphUrl, { query });

        const results = response.data.data.makeLiquidities;

        const totalRecordsResponse = await axios.post(subgraphUrl, {
            query: `
            query {
                makeLiquidities(where: { sender: "${sender}" }) {
                    id
                }
            }
            `
        });

        const totalRecords = totalRecordsResponse.data.data.makeLiquidities.length;
        const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
        const currentPage = parseInt(page);

        const responseData = {
            results,
            totalRecords,
            totalPages,
            currentPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
        };

        if (responseData.hasNextPage) {
            responseData.nextPage = `/api/liquidity-history?page=${currentPage + 1}`;
        }

        if (responseData.hasPreviousPage) {
            responseData.previousPage = `/api/liquidity-history?page=${currentPage - 1}`;
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error fetching makeLiquidities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
*/



//Tổ chức code cách 2

/*
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 4000;
const PAGE_SIZE = 8;
const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

// Hàm gửi yêu cầu API
async function sendAPIRequest(query) {
    try {
        const response = await axios.post(subgraphUrl, { query });
        return response.data.data;
    } catch (error) {
        console.error('Error sending API request:', error);
        throw new Error('API request failed');
    }
}

// Hàm lấy dữ liệu với phân trang
async function getLiquidityHistory(sender, page) {
    const skip = (page - 1) * PAGE_SIZE;
    const first = PAGE_SIZE;

    const query = `
    query {
      makeLiquidities(
        where: { sender: "${sender}" }
        orderBy: blockTime
        orderDirection: desc
        first: ${first}
        skip: ${skip}
      ) {
        action
        amountnft
        amounttoken
        blockNumber
        blockTime
        dml
        id
        liquidity
        sender
        to
        transactionHash
      }
    }
  `;

    const responseData = await sendAPIRequest(query);
    return responseData.makeLiquidities;
}

// Hàm lấy số lượng bản ghi tổng
async function getTotalRecords(sender) {
    const query = `
    query {
      makeLiquidities(where: { sender: "${sender}" }) {
        id
      }
    }
  `;

    const responseData = await sendAPIRequest(query);
    return responseData.makeLiquidities.length;
}

// API endpoint
app.get('/api/liquidity-history', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const sender = req.query.sender;

        const results = await getLiquidityHistory(sender, page);
        const totalRecords = await getTotalRecords(sender);
        const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
        const currentPage = parseInt(page);

        const responseData = {
            results,
            totalRecords,
            totalPages,
            currentPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
        };

        if (responseData.hasNextPage) {
            responseData.nextPage = `/api/liquidity-history?page=${currentPage + 1}`;
        }

        if (responseData.hasPreviousPage) {
            responseData.previousPage = `/api/liquidity-history?page=${currentPage - 1}`;
        }

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching liquidity history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
*/


//Tổ chức code cách 2 dùng Promise.all()

const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 4000;
const PAGE_SIZE = 8;

async function fetchMakeLiquidities(sender, first, skip) {
    const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

    const query = `
    query {
        makeLiquidities(
            where: { sender: "${sender}" }
            orderBy: blockTime
            orderDirection: desc
            first: ${first}
            skip: ${skip}
        ) {
            action
            amountnft
            amounttoken 
            blockNumber
            blockTime
            dml
            id
            liquidity
            sender
            to
            transactionHash
        }
    }
  `;

    const response = await axios.post(subgraphUrl, { query });
    return response.data.data.makeLiquidities;
}

async function fetchTotalRecords(sender) {
    const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

    const query = `
    query {
        makeLiquidities(where: { sender: "${sender}" }) {
            id
        }
    }
  `;

    const response = await axios.post(subgraphUrl, { query });
    return response.data.data.makeLiquidities.length;
}

app.get('/api/liquidity-history', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const skip = (page - 1) * PAGE_SIZE;
        const first = PAGE_SIZE;
        const sender = req.query.sender;

        const [results, totalRecords] = await Promise.all([
            fetchMakeLiquidities(sender, first, skip),
            fetchTotalRecords(sender)
        ]);

        const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
        const currentPage = parseInt(page);

        const responseData = {
            results,
            totalRecords,
            totalPages,
            currentPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
        };

        if (responseData.hasNextPage) {
            responseData.nextPage = `/api/liquidity-history?page=${currentPage + 1}`;
        }

        if (responseData.hasPreviousPage) {
            responseData.previousPage = `/api/liquidity-history?page=${currentPage - 1}`;
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error fetching makeLiquidities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
