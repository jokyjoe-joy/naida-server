const Pool = require("pg").Pool;

const pool = new Pool({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    ssl: process.env.NODE_ENV == 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;