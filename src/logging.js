const pool = require("./db/db");

async function Log(text) {
    var date = new Date();

    pool.query("INSERT INTO logs(message) VALUES($1)", [text]);

    const textToWrite = date.toLocaleString() + ' - ' + text;    
    if (process.env.NODE_ENV !== 'test')
        console.log(textToWrite);
}

module.exports = Log;