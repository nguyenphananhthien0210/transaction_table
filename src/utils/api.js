const axios = require('axios');

const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

async function fetchMakeLiquidities(sender, first, skip) {
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

module.exports = {
    fetchMakeLiquidities,
    fetchTotalRecords,
};
