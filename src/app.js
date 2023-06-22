const express = require('express');
const liquidityController = require('./controllers/liquidityController');
const serverConfig = require('./config/serverConfig');

const app = express();

app.get('/api/liquidity-history', liquidityController.getLiquidityHistory);

app.listen(serverConfig.port, () => {
    console.log(`Server listening on port ${serverConfig.port}`);
});
