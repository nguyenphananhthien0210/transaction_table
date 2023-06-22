
const axios = require('axios');
const express = require('express');
const Web3 = require('web3');
const mongoose = require('mongoose');
require('dotenv').config();

const abiDml = require('./abiDml.json')
const abiNft = require('./abiNft.json')
const abiToken = require('./abiToken.json')

const app = express();
const port = process.env.PORT || 4000;
const uri = process.env.MONGODB_URI

const subgraphUrl = 'https://api.studio.thegraph.com/query/46682/subgraph_demark_update_3/2';

app.get('/api/liquidity-list', async (req, res) => {

    const userAddress = req.query.userAddress;
    const Liquidity = getLiquidityModel(userAddress);

    try {
        const query = `
      query {
   makeLiquidities(where: {
        action: "Add",
        to: "${userAddress}"
    }) {
    action
          amountnft
          amounttoken
          blockNumber
          blockTime
          dml
          fee
          id
          liquidity
          sender
          to
          transactionHash
        }
   
    `;

        const response = await axios.post(subgraphUrl, { query });
        const makeLiquidities = response.data.data;


        for (const liquidity of makeLiquidities.addLiquidities) {
            const dml = liquidity.dml;
            if (!dmlValues.has(dml)) {
                dmlValues.add(dml);
                promises.push(fetchTokenMetadata(liquidity));
            }
            updateDmlLiquidity(dmlLiquidity, liquidity, 'Add', liquidity.blockTime);
        }

        for (const liquidity of makeLiquidities.removeLiquidities) {
            const dml = liquidity.dml;
            updateDmlLiquidity(dmlLiquidity, liquidity, 'Remove', liquidity.blockTime);
        }

        const results = await Promise.all(promises);
        for (const result of results) {
            const { dml, tokenId, nftName, tokenName } = result;
            dmlLiquidity[dml].tokenId = tokenId;
            dmlLiquidity[dml].nftName = nftName;
            dmlLiquidity[dml].tokenName = tokenName;
        }

        const responseData = Object.entries(dmlLiquidity).map(([dml, liquidity]) => {
            return {
                tokenId: liquidity.tokenId,
                nftName: liquidity.nftName,
                tokenName: liquidity.tokenName,
                dml,
                blockTime: liquidity.blockTime,
                lastAction: liquidity.lastAction,
            };
        });

        await Liquidity.deleteMany();

        for (const liquidity of responseData) {
            const { dml, blockTime, lastAction } = liquidity;

            const existingLiquidity = await Liquidity.findOne({ dml });
            if (existingLiquidity) {

                existingLiquidity.blockTime = blockTime;
                existingLiquidity.lastAction = lastAction;
                await existingLiquidity.save();
            } else {
                const newLiquidity = new Liquidity(liquidity);
                await newLiquidity.save();
            }
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const data = await Liquidity
            .find()
            .sort({ blockTime: 1 })
            .skip(skip)
            .limit(limit)
            .exec();

        const count = await Liquidity.countDocuments();
        const totalPages = Math.ceil(count / limit);

        const hasNextPage = skip + limit < count;

        const hasPreviousPage = page > 1;

        const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
        const nextUrl = hasNextPage ? `${baseUrl}?page=${page + 1}` : null;
        const prevUrl = hasPreviousPage ? `${baseUrl}?page=${page - 1}` : null;


        res.json({
            data,
            totalPages,
            currentPage: page,
            hasNextPage,
            hasPreviousPage,
            totalRecords: count,
            nextPage: nextUrl,
            previousPage: prevUrl,
        });

    } catch (error) {
        console.error('Error fetching makeLiquidities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function fetchTokenMetadata(liquidity) {
    const { dml } = liquidity;

    const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.ankr.com/polygon_mumbai'));
    const dmlContract = new web3.eth.Contract(abiDml, dml);

    const tokenId = await dmlContract.methods.id().call();
    const contractAddressNft = await dmlContract.methods.nft().call();
    const contractAddressToken = await dmlContract.methods.token().call();

    const nftContract = new web3.eth.Contract(abiNft, contractAddressNft);
    const tokenURI = await nftContract.methods.uri(tokenId).call();
    const { nftName, nftSymbol } = await getTokenMetadata(tokenURI);

    const tokenContract = new web3.eth.Contract(abiToken, contractAddressToken);
    const tokenName = await tokenContract.methods.name().call();

    return { dml, tokenId, nftName, nftSymbol, tokenName };
}

async function getTokenMetadata(tokenURI) {
    try {
        const response = await axios.get(tokenURI);
        const nftName = response.data.name;
        const nftSymbol = response.data.symbol;
        return {
            nftName, nftSymbol
        };
    } catch (error) {
        console.error('Error retrieving NFT name:', error);
        return null;
    }
}


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})

