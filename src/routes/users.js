const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const authenticateJWT = require('../auth').authenticateJWT;

router.get('/', authenticateJWT, async (req, res) => {
    try {
        return res.send("Welcome to users!");

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * from users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;

        const requestedUserData = (await pool.query("SELECT * from users WHERE id = $1", [req.params.id])).rows[0];
        // If the authenticated user is the same as the requested user, return all data.
        // Otherwise return only a limited amount, so that sensitive data is protected.
        if (req.params.id == authenticatedUserID) {
            return res.send(requestedUserData);
        } else {
            return res.send({
                "id": requestedUserData.id,
                "first_name": requestedUserData.first_name,
                "middle_name": requestedUserData.middle_name,
                "last_name": requestedUserData.last_name
            });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
})

// Post - to change/add an account to a user.
router.post('/:id/account', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;

        if (req.params.id == authenticatedUserID) {
            if (authenticatedUserData.account_id == req.body.account_id) {
                return res.status(400).send({ "message": "Can't set account_id to the current account_id." });
            }
            
            const requestedAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [req.body.account_id])).rows[0];
            const userWithRequestedAccount = (await pool.query("SELECT * FROM users WHERE account_id = $1", [req.body.account_id])).rows[0];

            if (requestedAccountData && !userWithRequestedAccount) {
                const updatedUserData = (await pool.query(
                    "UPDATE users SET account_id = $1 WHERE id = $2 RETURNING *", 
                    [req.body.account_id, authenticatedUserID])
                ).rows[0];
                
                return res.send({ "account_id": updatedUserData.account_id });
            } else {
                return res.status(403).send({ "message": "Account either doesn't exist or is linked to another user." });
            }
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
})

module.exports = router;