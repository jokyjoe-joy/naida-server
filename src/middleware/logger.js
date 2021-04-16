const pool = require("../db/db");

async function Log(text) {
    const date = new Date();
    pool.query("INSERT INTO logs(message) VALUES($1)", [text]);

    if (process.env.NODE_ENV !== 'test')
        console.log(date.toLocaleString() + ' - ' + text);
}

const logger = (req, res, next) => {
    const date = new Date();
    const ip = req.ip;
    const method = req.method;
    const path = req.path;

    const text = `${method} request to ${path} by ${ip}`;
    pool.query("INSERT INTO logs(message) VALUES($1)", [text]);

    if (process.env.NODE_ENV !== 'test')
        console.log(date.toLocaleString() + ' - ' + text);

    next();
};

module.exports.logger = logger;
module.exports.Log = Log;