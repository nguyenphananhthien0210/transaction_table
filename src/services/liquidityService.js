const api = require('../utils/api');

const PAGE_SIZE = 8;

async function getLiquidityData(sender, page) {
    const skip = (page - 1) * PAGE_SIZE;
    const first = PAGE_SIZE;

    const makeLiquidities = await api.fetchMakeLiquidities(sender, first, skip);
    const totalRecords = await api.fetchTotalRecords(sender);
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

    return {
        results: makeLiquidities,
        totalRecords,
        totalPages,
    };
}

module.exports = {
    getLiquidityData,
};
