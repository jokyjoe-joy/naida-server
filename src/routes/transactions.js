const express = require('express');
const router = express.Router();
const pool = require("../db/db");
const authenticateJWT = require('../middleware/auth').authenticateJWT;

router.get('/', authenticateJWT, async (req, res) => {
    try {
        return res.send("Welcome to transactions!");

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;