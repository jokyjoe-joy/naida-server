const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const authenticateJWT = require('../middleware/auth').authenticateJWT;
const Log = require('../middleware/logger').Log;

async function returnUserData(userID, authenticatedUserData) {
    try {
        const requestedUserData = (await pool.query("SELECT * from users WHERE id = $1", [userID])).rows[0];
        // If the authenticated user is the same as the requested user, return all data.
        // Otherwise return only a limited amount, so that sensitive data is protected.
        if (userID == authenticatedUserData.id) {
            Log(`USERS: User ${authenticatedUserData.username} requested its own data.`);
            return (requestedUserData);
        } else {
            Log(`USERS: User ${authenticatedUserData.username} requested ${requestedUserData.username}'s data.`);
            return ({
                "id": requestedUserData.id,
                "first_name": requestedUserData.first_name,
                "middle_name": requestedUserData.middle_name,
                "last_name": requestedUserData.last_name
            });
        }
    } catch (error) {
        Log(`USERS: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
}

router.get('/', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * from users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;
        const requestedData = await returnUserData(authenticatedUserID, authenticatedUserData);
        res.send(requestedData);

    } catch (error) {
        Log(`USERS: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * from users WHERE username = $1", [req.user.username])).rows[0];
        const requestedData = await returnUserData(req.params.id, authenticatedUserData);
        res.send(requestedData);
    } catch (error) {
        Log(`USERS: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
})

// Post - to change/add an account to a user.
router.post('/:id/account', authenticateJWT, async (req, res) => {
    try {
        // This one is probably unneccessary, as in accounts.js, upon a POST request to '/',
        // the account is linked to the user after creation.
        // Thus for now, this request will be removed.
        return res.sendStatus(405);
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;

        if (req.params.id == authenticatedUserID) {
            if (authenticatedUserData.account_id == req.body.account_id) {
                Log(`USERS: Unsuccessful account_id change by ${authenticatedUserData.username}, can't set account_id to the current account_id.`);
                return res.status(400).send({ "message": "Can't set account_id to the current account_id." });
            }
            
            const requestedAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [req.body.account_id])).rows[0];
            const userWithRequestedAccount = (await pool.query("SELECT * FROM users WHERE account_id = $1", [req.body.account_id])).rows[0];

            if (requestedAccountData && !userWithRequestedAccount) {
                const updatedUserData = (await pool.query(
                    "UPDATE users SET account_id = $1 WHERE id = $2 RETURNING *", 
                    [req.body.account_id, authenticatedUserID])
                ).rows[0];
                
                Log(`USERS: Account_id changed to ${req.body.account_id} from ${authenticatedUserData.account_id} by ${authenticatedUserData.username}.`);
                return res.send({ "account_id": updatedUserData.account_id });
            } else {
                Log(`USERS: Unsuccessful account_id change to ${req.body.account_id} by ${authenticatedUserData.username}, account either doesn't exist or is linked to another user.`);
                return res.status(403).send({ "message": "Account either doesn't exist or is linked to another user." });
            }
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        Log(`USERS: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
})

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const authenticatedUserID = authenticatedUserData.id;

        if (req.params.id == authenticatedUserID) {
            await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
            Log(`USERS: User ${authenticatedUserData.username} successfully deleted its own user.`);
            return res.sendStatus(200);
        } else {
            Log(`USERS: Unsuccessful user deletion of user with id of ${req.params.id} by user ${authenticatedUserData.username}, not authorized.`);
            return res.sendStatus(403);
        }
    } catch (error) {
        Log(`USERS: Internal server error (${error.message})`);
        res.status(500).json({ message: error.message });
    }
})

module.exports = router;