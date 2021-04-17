const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const Log = require('../middleware/logger').Log;
const { isAdmin, authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const requestedData = (await pool.query("SELECT * FROM transactions ORDER BY id DESC")).rows;
        return res.send(requestedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', authenticateJWT, async (req, res) => {
    try {
        const { receiver_account_id, amount_of_money, receiver_first_name, receiver_last_name, message } = req.body;

        const senderUserData = (await pool.query("SELECT * FROM users WHERE username = $1", [req.user.username])).rows[0];
        const senderAccountID = senderUserData.account_id;
        const senderAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [senderAccountID])).rows[0];
        
        const receiverAccountData = (await pool.query("SELECT * FROM accounts WHERE id = $1", [receiver_account_id])).rows[0];
        const receiverUserData = (await pool.query("SELECT * FROM users WHERE account_id = $1", [receiver_account_id])).rows[0];
        
        const accountsExist = receiverAccountData && senderAccountData;
        const receiverNamesMatch = receiverUserData.first_name == receiver_first_name && receiverUserData.last_name == receiver_last_name;
        const isSenderSameAsReceiver = senderAccountData.id == receiverAccountData.id;
        const senderHasEnoughMoney = senderAccountData.amount_of_money >= amount_of_money;

        if (accountsExist && receiverNamesMatch && !isSenderSameAsReceiver && senderHasEnoughMoney) {
            const pendingTransactionData = (await pool.query(
                "INSERT INTO transactions(sender_account_id, receiver_account_id, amount_of_money, message, sender_first_name, sender_last_name) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
                [senderAccountData.id, receiverAccountData.id, amount_of_money, message, senderUserData.first_name, senderUserData.last_name]
            )).rows[0];
            
            const updatedSenderAccount = (await pool.query(
                "UPDATE accounts SET amount_of_money = $1 WHERE id = $2 RETURNING *", 
                [parseInt(senderAccountData.amount_of_money) - amount_of_money, senderAccountData.id])
            ).rows[0];

            const updatedReceiverAccount = (await pool.query(
                "UPDATE accounts SET amount_of_money = $1 WHERE id = $2 RETURNING *", 
                [parseInt(receiverAccountData.amount_of_money) + amount_of_money, receiverAccountData.id])
            ).rows[0];
            
            const successfulTransactionData = (await pool.query(
                "UPDATE transactions SET status = 'SUCCESSFUL', finished_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
                [pendingTransactionData.id]
            )).rows[0];

            Log(`TRANSACTIONS: Successful transaction by ${senderUserData.username} (account: ${senderAccountData.id}) of ${amount_of_money}$ to the account with the ID of ${receiverAccountData.id}.`, 'log');
            return res.send(successfulTransactionData);
        } else {
            Log(`TRANSACTIONS: Failed transaction by ${senderUserData.username}, wrong parameters given by user.`, 'warning');
            return res.status(400).send({ message: "Failed transaction. Check the transaction's parameters." });
        }
    } catch (error) {
        Log(`TRANSACTIONS: Internal server error (${error.message})`, 'error');
        res.status(500).json({ message: error.message });
    }
})

module.exports = router;