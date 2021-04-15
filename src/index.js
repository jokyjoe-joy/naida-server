require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const pool = require("./db/db");
const argon2 = require('argon2');
const Log = require('./logging');

// Parsers for POST data
app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Token secrets
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const refreshTokens = [];

// Routes
const accountRoutes = require('./routes/accounts');
app.use('/accounts', accountRoutes);
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);
const transactionRoutes = require('./routes/transactions');
app.use('/transactions', transactionRoutes);



// Authentication handlers below [TODO: move them to their own file]

function CheckIfPasswordIsWeak(password) {
    // Check if contains at least 2 upper-case char
    let re = new RegExp('([^A-Z]*[A-Z]){2}');
    const hasUpperCase = re.test(password);
    // Check if contains at least 2 lower-case char
    re = new RegExp('([^a-z]*[a-z]){2}');
    const hasLowerCase = re.test(password);
    // Check if contains at least 2 digits
    re = new RegExp('([^0-9]*[0-9]){2}');
    const hasDigits = re.test(password);
    // Check if contains at least one special character
    re = new RegExp('[^!@#$&*]*[!@#$&*]');
    const hasSpecial = re.test(password);
    // Check if longer than 8 chars.
    re = new RegExp('.{8,}');
    const isLongEnough = re.test(password);
    
    if (hasUpperCase && hasLowerCase && hasDigits && hasSpecial && isLongEnough) {
        return false;
    } else {
        return true;
    }
}

app.post('/login', async (req, res) => {
    try
    {
        const { username, password } = req.body;

        let user = await pool.query("SELECT * from users WHERE username = $1", [username]);

        if (user.rows[0] && await argon2.verify(user.rows[0].password, password)) {
            // Need to get user info here, because .rows[0] doesn't exist if there is no user found.
            user = user.rows[0];
            Log(`LOGIN: Successful login with the username of ${username}.`);   
            const accessToken = jwt.sign({ username: user.username }, accessTokenSecret, { expiresIn: process.env.TOKEN_EXPIRATION_IN_MINUTES + 'm' });
            const refreshToken = jwt.sign({ username: user.username }, refreshTokenSecret);

            refreshTokens.push(refreshToken);

            res.json({ accessToken, refreshToken });
        } else {
            Log(`LOGIN: Failed login with the username of ${username}.`);
            res.send('Username or password incorrect');
        }
    }
    catch (error)
    {
        Log(`LOGIN: Internal server error (${error.message})`);
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
        const { first_name, middle_name, last_name } = req.body;
        const { username, password } = req.body;
        const { place_of_birth, date_of_birth } = req.body;

        const userWithSameUsername = (await pool.query("SELECT * FROM users WHERE username = $1", [username])).rows[0];
        if (userWithSameUsername) {
            Log(`REGISTER: Failed registration, user already exists with the username of ${username}.`);
            return res.status(400).send({ message: "User with same username already exists." });
        }

        const isPasswordTooWeak = CheckIfPasswordIsWeak(password);
        if (isPasswordTooWeak) {
            Log(`REGISTER: Failed registration, ${username}'s given password doesn't meet the complexity requirements.`);
            return res.status(400).send({ message: "The given password doesn't meet complexity requirements." });
        }

        const hashedPassword = await argon2.hash(password);
        const user = await pool.query(
            `INSERT INTO users(first_name, middle_name, last_name, username, password, place_of_birth, date_of_birth)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [first_name, middle_name, last_name, username, hashedPassword, place_of_birth, date_of_birth]
        );

        Log(`REGISTER: Successful registration, new user registered with the username of ${username}.`);

        res.send(user.rows[0]);
    }
    catch (error)
    {
        Log(`REGISTER: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
})

app.listen(3000, () => {
    Log("STARTUP: Service started on port 3000.");
});

module.exports = app;