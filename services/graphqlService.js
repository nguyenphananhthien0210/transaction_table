const { ApolloClient } = require('apollo-client');
const gql = require('apollo-boost').gql;
const { HttpLink } = require('apollo-link-http');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { getNftAndTokenName } = require('./mongodbService');

const httpLink = new HttpLink({
    uri: 'https://api.studio.thegraph.com/query/46682/subgraph_demark/2',
});

const cache = new InMemoryCache();

const apolloClient = new ApolloClient({
    link: httpLink,
    cache: cache,
});

const query = gql`
  query {
    makeTransactions {
      id
      action
      amounterc
      amountnft
      blockTime
      blockNumber
      dml
      price
      sender
      to
      transactionHash
    }
  }
`;

async function querySubgraph() {
    try {
        await apolloClient.query({ query });
        const results = response.data.makeTransactions;

        const newRecords = [];

        for (const record of results) {
            const { dml } = record;
            const { tokenName, nftName } = await getNftAndTokenName(dml);
            console.log('Token Name:', tokenName);
            console.log('NFT Name:', nftName);

            const existingAction = record.action;
            const updatedAction = `${existingAction} ${nftName} from ${tokenName}`;
            record.action = updatedAction;

            console.log('Updated Action:', updatedAction);

            // Check if record already exists
            const client = getClient();
            const collection = client.db('Mydata4').collection('new_collection3');
            const existingRecord = await collection.findOne({ id: record.id });

            if (existingRecord) {
                console.log(`Record with id ${record.id} already exists. Skipping insertion.`);
            } else {
                newRecords.push(record);
            }
        }

        // Insert new records into the database
        if (newRecords.length > 0) {
            const client = getClient();
            const collection = client.db('Mydata4').collection('new_collection3');
            const insertResult = await collection.insertMany(newRecords);
            console.log(`${insertResult.insertedCount} new records inserted`);
        } else {
            console.log('No new records to insert.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = {
    querySubgraph,
};
