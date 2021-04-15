require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const pool = require("./db/db");
const bcrypt = require('bcrypt');

// Parsers for POST data
app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Token secrets
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const refreshTokens = [];

// Bcrypt config
const saltRounds = process.env.BCRYPT_SALT_ROUNDS;

// Routes
const accountRoutes = require('./routes/accounts');
app.use('/accounts', accountRoutes);
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);
const transactionRoutes = require('./routes/transactions');
app.use('/transactions', transactionRoutes);


// Authentication handlers
app.post('/login', async (req, res) => {
    try
    {
        const { username, password } = req.body;

        let user = await pool.query("SELECT * from users WHERE username = $1", [username]);

        if (user.rows[0] && await bcrypt.compare(password, user.rows[0].password)) {
            // Need to get user info here, because .rows[0] doesn't exist if there is no user found.
            user = user.rows[0];

            const accessToken = jwt.sign({ username: user.username }, accessTokenSecret, { expiresIn: process.env.TOKEN_EXPIRATION_IN_MINUTES + 'm' });
            const refreshToken = jwt.sign({ username: user.username }, refreshTokenSecret);

            refreshTokens.push(refreshToken);

            res.json({ accessToken, refreshToken });
        } else {
            res.send('Username or password incorrect');
        }
    }
    catch (error)
    {
        res.status(500).json({ message: error.message });
    }
   
});

app.post('/token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.sendStatus(401);
    }

    if (!refreshTokens.includes(token)) {
        return res.sendStatus(403);
    }

    jwt.verify(token, refreshTokenSecret, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }

        const accessToken = jwt.sign({ username: user.username }, accessTokenSecret, { expiresIn: process.env.TOKEN_EXPIRATION_IN_MINUTES + 'm' });

        res.json({ accessToken });
    });
});

app.post('/logout', (req, res) => {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter(token => t !== token);
    res.send("Logout successful");
});

app.post('/register', async (req, res) => {
    try
    {
        // TODO: Error messages.
        const { first_name, middle_name, last_name } = req.body;
        const { username, password } = req.body;
        const { place_of_birth, date_of_birth } = req.body;

        const hashedPassword = await bcrypt.hash(password, parseInt(saltRounds));
        const user = await pool.query(
            `INSERT INTO users(first_name, middle_name, last_name, username, password, place_of_birth, date_of_birth)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [first_name, middle_name, last_name, username, hashedPassword, place_of_birth, date_of_birth]
        );


        res.send(user.rows[0]);


    }
    catch (error)
    {
        res.status(500).json({ message: error.message });
    }
})

app.listen(3000, () => {
    console.log('Service started on port 3000');
});
