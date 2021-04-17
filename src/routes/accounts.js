const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const Log = require('../middleware/logger').Log;
const { authenticateJWT, isAdmin } = require('../middleware/auth');

async function getAccountData(account_id, authenticatedUserData) {
    const requestedAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [account_id])).rows[0];

    // TODO: Is this plausible everywhere? This way we don't have a 404 error.
    if (account_id == authenticatedUserData.account_id) {
        return (requestedAccountData);
    } else {
        return false;
    }
}

router.get('/', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const requestedAccounts = (await pool.query("SELECT * FROM accounts ORDER BY id DESC")).rows;
        return res.send(requestedAccounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/me', authenticateJWT, async (req,res) => {
    try {
        const requestedAccountData = await getAccountData(req.params.id, authenticatedUserData)

        if (requestedAccountData)
            return res.send(requestedAccountData);
        else
            return res.sendStatus(403);
    } catch (error) {
        Log(`ACCOUNTS: Internal server error (${error.message})`, 'error');
        res.status(500).json({ message: error.message });
    }
})

router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const requestedAccountData = await getAccountData(req.params.id, authenticatedUserData)

        if (requestedAccountData)
            return res.send(requestedAccountData);
        else
            return res.sendStatus(403);
    } catch (error) {
        Log(`ACCOUNTS: Internal server error (${error.message})`, 'error');
        res.status(500).json({ message: error.message });
    }
})

router.get('/:id/owner', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const ownerOfRequestedAccount = (await pool.query("SELECT * FROM users WHERE account_id = $1", [req.params.id])).rows[0];
        // An admin should not have access to a user's password.
        delete ownerOfRequestedAccount['password'];
        return res.send(ownerOfRequestedAccount);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})

router.post('/', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];        
        const authenticatedUserID = authenticatedUserData.id;
        
        // Only admins should be able to create an account if they already have an account.
        if (authenticatedUserData.account_id && req.user.role != 'admin') {
            Log(`ACCOUNTS: Unsuccessful account creation by ${authenticatedUserData.username}, user already has an account.`, 'warning');
            return res.status(400).json({ message: "User already has an account." });
        }

        const createdAccountData = (await pool.query(`INSERT INTO accounts(amount_of_money) VALUES(0) RETURNING *`)).rows[0];
        Log(`ACCOUNTS: New account created by ${authenticatedUserData.username} with an ID of ${createdAccountData.id}.`, 'log');
        
        if (!authenticatedUserData.account_id) {
            const updatedUserData = (await pool.query(
                "UPDATE users SET account_id = $1 WHERE id = $2 RETURNING *", 
                [createdAccountData.id, authenticatedUserID])).rows[0];
            Log(`ACCOUNTS: The new account with the ID of ${createdAccountData.id} has been linked to ${authenticatedUserData.username}.`, 'log');
        }

        return res.send(createdAccountData);
    } catch (error) {
        Log(`ACCOUNTS: Internal server error (${error.message})`, 'error');
        return res.status(500).json({ message: error.message });
    }
})

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const authenticatedUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];        

        if (authenticatedUserData.account_id == req.params.id) {
            await pool.query("DELETE FROM accounts WHERE id = $1", [req.params.id]);
            Log(`ACCOUNTS: Account ${req.params.id} has been deleted by ${authenticatedUserData.username}.`, 'log');
            return res.sendStatus(200);
        } else {
            Log(`ACCOUNTS: Unsuccessful account deletion of account ${req.params.id} by ${authenticatedUserData.username}.`, 'warning');
            return res.sendStatus(403);
        }
    } catch (error) {
        Log(`ACCOUNTS: Internal server error (${error.message})`, 'error');
        return res.status(500).json({ message: error.message });
    }    
})

module.exports = router;