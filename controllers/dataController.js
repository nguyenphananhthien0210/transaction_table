const moment = require('moment');
const { getNftAndTokenName } = require('../services/graphqlService');
const { getFormattedRelativeTime } = require('../utils/momentUtils');
const { getClient } = require('../config/mongodb');

async function getData(req, res) {
    try {
        const client = getClient();
        const collection = client.db('Mydata4').collection('new_collection3');

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Fetch data and sort by blockTime in descending order
        const data = await collection
            .find()
            .sort({ blockTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Extract the required fields and format the response
        const formattedData = await Promise.all(
            data.map(async (record) => {
                const { action, amountnft, amounterc, sender, blockTime, transactionHash } = record;

                // Convert blockTime to relative time
                const blockTimeRelative = getFormattedRelativeTime(blockTime);

                // Generate the link for the action value
                const actionLink = `https://mumbai.polygonscan.com/tx/${transactionHash}`;

                return {
                    action: {
                        value: action,
                        link: actionLink,
                    },
                    amountnft,
                    amounterc,
                    sender,
                    blockTime: blockTimeRelative,
                };
            })
        );

        // Calculate total pages
        const count = await collection.countDocuments();
        const totalPages = Math.ceil(count / limit);

        // Check if there is a next page
        const hasNextPage = skip + limit < count;

        // Check if there is a previous page
        const hasPreviousPage = page > 1;

        // Generate links for next and previous pages
        const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
        const nextUrl = hasNextPage ? `${baseUrl}?page=${page + 1}` : null;
        const prevUrl = hasPreviousPage ? `${baseUrl}?page=${page - 1}` : null;

        res.json({
            data: formattedData,
            totalPages,
            currentPage: page,
            hasNextPage,
            hasPreviousPage,
            totalRecords: count,
            nextPage: nextUrl,
            previousPage: prevUrl,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
}

module.exports = {
    getData,
};
