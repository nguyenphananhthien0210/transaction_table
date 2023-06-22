const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 4000;
const mongoURI = process.env.MONGODB_URI;

const exchangeRateSchema = new mongoose.Schema({
    symbol: { type: String, unique: true },
    usd_price: Number,
    last_updated: { type: Date, default: Date.now }
});

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);

            updateExchangeRates();
            setInterval(updateExchangeRates, 3600000);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
    });

async function updateExchangeRates() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd');
        const data = response.data;

        await Promise.all([
            updateExchangeRate('ETH', data.ethereum.usd),
            updateExchangeRate('BTC', data.bitcoin.usd)
        ]);

        console.log('Exchange rates updated');
    } catch (error) {
        console.error('Failed to update exchange rates:', error);
    }
}

async function updateExchangeRate(symbol, usdPrice) {
    try {
        const filter = { symbol };
        const update = { usd_price: usdPrice, last_updated: new Date() };
        await ExchangeRate.findOneAndUpdate(filter, update, { upsert: true });
    } catch (error) {
        console.error(`Failed to update exchange rate for ${symbol}:`, error);
    }
}