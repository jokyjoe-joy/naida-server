require('dotenv').config();
const express = require('express');
const app = express();
const Log = require('./logging');

// Parsers for POST data
app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Routes
const accountRoutes = require('./routes/accounts');
app.use('/accounts', accountRoutes);
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);
const transactionRoutes = require('./routes/transactions');
app.use('/transactions', transactionRoutes);
const authenticationRoutes = require('./routes/authentication')
app.use('/', authenticationRoutes);

app.listen(process.env.PORT || 5000, () => {
    Log("STARTUP: Service started on port 5000.");
});

module.exports = app;