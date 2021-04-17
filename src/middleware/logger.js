const pool = require("../db/db");

async function Log(text, type='log') {
    if (!['log','warning','error'].includes(type.toLowerCase())) {
        console.warning("Wrong log type given! Defaulting to 'log'.");
        type = 'LOG';
    }

    const date = new Date();
    pool.query("INSERT INTO logs(message, type) VALUES($1, $2)", [text, type.toUpperCase()]);

    if (process.env.NODE_ENV !== 'test')
        console.log(`${date.toLocaleString()} - ${type.toUpperCase()} - ${text}`);
}

const logger = (req, res, next) => {
    const date = new Date();
    const ip = req.ip;
    const method = req.method;
    const path = req.path;

    const text = `${method} request to ${path} by ${ip}`;
    pool.query("INSERT INTO logs(message, type) VALUES($1, $2)", [text, 'LOG']);

    if (process.env.NODE_ENV !== 'test')
        console.log(`${date.toLocaleString()} - LOG - ${text}`);

    next();
};

module.exports.logger = logger;
module.exports.Log = Log;