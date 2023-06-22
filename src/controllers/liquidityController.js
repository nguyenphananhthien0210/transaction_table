const liquidityService = require('../services/liquidityService');

async function getLiquidityHistory(req, res) {
    try {
        const { page = 1, sender } = req.query;
        const { results, totalRecords, totalPages } = await liquidityService.getLiquidityData(sender, page);

        const responseData = {
            results,
            totalRecords,
            totalPages,
            currentPage: parseInt(page),
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };

        if (responseData.hasNextPage) {
            responseData.nextPage = `/api/liquidity-history?page=${parseInt(page) + 1}`;
        }

        if (responseData.hasPreviousPage) {
            responseData.previousPage = `/api/liquidity-history?page=${parseInt(page) - 1}`;
        }

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching liquidity data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getLiquidityHistory,
};
