const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const Log = require("../logging");
const authenticateJWT = require('../middleware/auth').authenticateJWT;

router.get('/', authenticateJWT, async (req, res) => {
    try {
        return res.send("Welcome to accounts!");

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserAccountID = authenticatedUserData.account_id;
        const requestedAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [req.params.id])).rows[0];

        if (req.params.id == authenticatedUserAccountID) {
            return res.send(requestedAccountData);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
})

router.get('/:id/owner', authenticateJWT, async (req, res) => {
    try {
        // I don't know whether this would be plausible in a real-world banking system.
        // Thus for now, this request will be removed.
        return res.sendStatus(405);

        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;

        const ownerOfRequestedAccount = (await pool.query("SELECT * FROM users WHERE account_id = $1", [req.params.id])).rows[0];
        // If the authenticated user is the same as the requested user, return all data.
        // Otherwise return only a limited amount, so that sensitive data is protected.
        if (ownerOfRequestedAccount.id == authenticatedUserID) {
            return res.send(ownerOfRequestedAccount);
        } else {
            return res.send({
                "id": ownerOfRequestedAccount.id,
                "first_name": ownerOfRequestedAccount.first_name,
                "middle_name": ownerOfRequestedAccount.middle_name,
                "last_name": ownerOfRequestedAccount.last_name
            });
        }

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})

router.post('/', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];        
        const authenticatedUserID = authenticatedUserData.id;
        
        // Only create a new account if user doesn't have one already. Therefore avoiding way too many accounts.
        if (authenticatedUserData.account_id) {
            Log(`ACCOUNTS: Unsuccessful account creation by ${authenticatedUserData.username}, user already has an account.`);
            return res.status(400).json({ message: "User already has an account." });
        }

        const createdAccountData = (await pool.query(`INSERT INTO accounts(amount_of_money) VALUES(0) RETURNING *`)).rows[0];
        Log(`ACCOUNTS: New account created by ${authenticatedUserData.username} with an ID of ${createdAccountData.id}.`);
        
        // Linking to new user after creating.
        const updatedUserData = (await pool.query(
            "UPDATE users SET account_id = $1 WHERE id = $2 RETURNING *", 
            [createdAccountData.id, authenticatedUserID])
        ).rows[0];

        Log(`ACCOUNTS: The new account with the ID of ${createdAccountData.id} has been linked to ${authenticatedUserData.username}.`);
        return res.send(createdAccountData);
    } catch (error) {
        Log(`ACCOUNTS: Internal server error (${error.message})`);
        return res.status(500).json({ message: error.message });
    }
})


module.exports = router;