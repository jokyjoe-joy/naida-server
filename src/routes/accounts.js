const express = require('express');
const router = express.Router();
const pool = require("../db/db");
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


module.exports = router;