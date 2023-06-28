
// const { MongoClient } = require('mongodb');
// const axios = require('axios');
// require('dotenv').config();

// const uri = process.env.CONNECTED_MONGODB_URI;
// const databaseName = process.env.RATE_PRICE;
// const collectionName = process.env.RATE_PRICE;
// const client = new MongoClient(uri);

// async function getRatePriceFromDatabase(tokenSymbol) {

//     try {
//         await client.connect();
//         const db = client.db(databaseName);
//         const collection = db.collection(collectionName);

//         const tokenInfo = await collection.findOne({ tokenSymbol: tokenSymbol });
//         if (!tokenInfo) {
//             console.log('Không tìm thấy tỷ giá trong cơ sở dữ liệu. Lấy từ API và cập nhật.');

//             // Lấy tỷ giá mới từ API
//             const updatedTokenInfo = await getTokenPriceFromAPI(tokenSymbol);

//             // Cập nhật tỷ giá mới vào cơ sở dữ liệu
//             await updateTokenPricesInDatabase(updatedTokenInfo);

//             return updatedTokenInfo.ratePrice;
//         }

//         const currentTime = Math.floor(Date.now() / 1000);
//         const lastUpdatedTime = tokenInfo.lastUpdatedTime || 0;
//         const timeDiff = currentTime - lastUpdatedTime;
//         const fiveMinutesInSeconds = 5 * 60 * 60;

//         if (timeDiff > fiveMinutesInSeconds) {
//             console.log('Tỷ giá đã quá hạn, lấy từ API và cập nhật cơ sở dữ liệu.');

//             // Lấy tỷ giá mới từ API
//             const updatedTokenInfo = await getTokenPriceFromAPI(tokenSymbol);

//             // Cập nhật tỷ giá mới vào cơ sở dữ liệu
//             await updateTokenPricesInDatabase(updatedTokenInfo);

//             return updatedTokenInfo.ratePrice;
//         } else {
//             console.log('Sử dụng tỷ giá từ cơ sở dữ liệu.');

//             return tokenInfo.ratePrice;
//         }
//     } catch (error) {
//         console.error('Lỗi khi lấy tỷ giá từ cơ sở dữ liệu:', error);
//         return null;
//     } finally {
//         await client.close();
//     }
// }

// async function getTokenIdFromCoinGecko(tokenSymbol) {
//     try {
//         const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
//         const tokenList = response.data;

//         const matchedToken = tokenList.find(token => token.symbol.toLowerCase() === tokenSymbol.toLowerCase());

//         if (!matchedToken) {
//             console.log(`Không tìm thấy thông tin cho tokenSymbol ${tokenSymbol}`);
//             return null;
//         }

//         const tokenId = matchedToken.id;

//         console.log(`ID của tokenSymbol ${tokenSymbol} là ${tokenId}`);

//         return tokenId;
//     } catch (error) {
//         console.error(`Lỗi khi lấy ID cho tokenSymbol ${tokenSymbol} từ CoinGecko API:`, error);
//         return null;
//     }
// }

// async function getTokenPriceFromAPI(tokenSymbol) {
//     try {
//         const tokenId = await getTokenIdFromCoinGecko(tokenSymbol);
//         if (!tokenId) {
//             // Token không tồn tại trong danh sách
//             return null;
//         }

//         const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`);
//         const data = response.data;

//         const ratePrice = data[tokenId].usd;

//         const currentTime = Math.floor(Date.now() / 1000);

//         const tokenInfo = {
//             id: tokenId,
//             tokenSymbol: tokenSymbol.toLowerCase(),
//             ratePrice: ratePrice,
//             lastUpdatedTime: currentTime
//         };

//         console.log('Tỷ giá mới từ API:', tokenInfo);

//         return tokenInfo;
//     } catch (error) {
//         console.error('Lỗi khi lấy tỷ giá từ API:', error);
//         return null;
//     }
// }

// async function updateTokenPricesInDatabase(tokenInfo) {

//     try {
//         await client.connect();
//         const db = client.db(databaseName);
//         const collection = db.collection(collectionName);

//         await collection.updateOne({ tokenSymbol: tokenInfo.tokenSymbol }, { $set: tokenInfo }, { upsert: true });

//         console.log('Cập nhật tỷ giá vào cơ sở dữ liệu thành công.');
//     } catch (error) {
//         console.error('Lỗi khi cập nhật tỷ giá vào cơ sở dữ liệu:', error);
//     } finally {
//         await client.close();
//     }
// }

// module.exports = {
//     getRatePriceFromDatabase,
// };



const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const uri = process.env.CONNECTED_MONGODB_URI;
const databaseName = process.env.RATE_PRICE;
const collectionName = process.env.RATE_PRICE_2;
const client = new MongoClient(uri);

async function getRatePriceFromDatabase(tokenSymbol) {
    try {
        await client.connect();
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        const tokenInfo = await collection.findOne({ tokenSymbol: tokenSymbol });

        if (!tokenInfo) {
            console.log(`Không tìm thấy tỷ giá cho ${tokenSymbol} trong cơ sở dữ liệu. Lấy từ API và cập nhật.`);

            // Lấy tỷ giá từ API cho các token symbol
            const updatedTokenInfoList = await getTokenPricesFromAPI();

            // Cập nhật tỷ giá vào cơ sở dữ liệu
            await updateTokenPricesInDatabase(updatedTokenInfoList);

            const updatedTokenInfo = updatedTokenInfoList.find(info => info.tokenSymbol === tokenSymbol);

            if (!updatedTokenInfo) {
                console.log(`Không tìm thấy tỷ giá cho ${tokenSymbol} sau khi cập nhật.`);
                return null;
            }

            console.log(`Tỷ giá cho ${tokenSymbol}: ${updatedTokenInfo.ratePrice}`);
            return updatedTokenInfo.ratePrice;
        }

        console.log(`Tỷ giá cho ${tokenSymbol}: ${tokenInfo.ratePrice}`);
        return tokenInfo.ratePrice;
    } catch (error) {
        console.error('Lỗi khi lấy tỷ giá từ cơ sở dữ liệu:', error);
        return null;
    } finally {
        await client.close();
    }
}

async function getTokenPricesFromAPI() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=weth,ethereum,tether,usd-coin&vs_currencies=usd');
        const data = response.data;

        const updatedTokenInfoList = Object.entries(data).map(([id, tokenData]) => {
            const tokenSymbol = getTokenSymbolFromId(id);
            const ratePrice = tokenData.usd;
            const currentTime = Math.floor(Date.now() / 1000);

            return {
                id: id,
                tokenSymbol: tokenSymbol,
                ratePrice: ratePrice,
                lastUpdatedTime: currentTime,
            };
        });

        console.log('Tỷ giá mới từ API:', updatedTokenInfoList);

        return updatedTokenInfoList;
    } catch (error) {
        console.error('Lỗi khi lấy tỷ giá từ API:', error);
        return [];
    }
}

async function updateTokenPricesInDatabase(tokenInfoList) {
    try {
        await client.connect();
        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        for (const tokenInfo of tokenInfoList) {
            await collection.updateOne({ id: tokenInfo.id }, { $set: tokenInfo }, { upsert: true });
        }

        console.log('Cập nhật tỷ giá vào cơ sở dữ liệu thành công.');
    } catch (error) {
        console.error('Lỗi khi cập nhật tỷ giá vào cơ sở dữ liệu:', error);
    } finally {
        await client.close();
    }
}

function getTokenSymbolFromId(id) {
    const symbolMap = {
        'weth': 'weth',
        'ethereum': 'eth',
        'tether': 'usdt',
        'usd-coin': 'usdc',
    };

    return symbolMap[id] || '';
}

//export { getRatePriceFromDatabase };
module.exports = {
    getRatePriceFromDatabase,
};