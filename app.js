const express = require('express');
const { connect } = require('./config/mongodb');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const port = 3000;

app.use('/data', dataRoutes);

connect()
    .then(() => {
        app.listen(port, () => {
            console.log(`API server is running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
    });


