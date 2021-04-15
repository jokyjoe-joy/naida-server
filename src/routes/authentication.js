const express = require('express');
const router = express.Router();
const Log = require("../logging");
const pool = require("../db/db");
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');

// Token secrets
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
let refreshTokens = [];

// Argon2 config
// Note: for production (depending on host), some of these numbers should be set higher.
// However, for development this is good enough.
const argon2_config = {
    type: argon2.argon2id,
    memoryCost: 2**15,
    timeCost: 4,
    hashLength: 32,
    saltLength: 16,
    parallelism: 4,
}

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

router.post('/login', async (req, res) => {
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

router.post('/register', async (req, res) => {
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

        const hashedPassword = await argon2.hash(password, argon2_config);
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

router.post('/token', (req, res) => {
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

router.post('/logout', (req, res) => {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter(t => t !== token);
    return res.send("Logout successful");
});

module.exports = router;