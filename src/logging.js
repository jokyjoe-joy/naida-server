const fs = require('fs'); // for Log()

function Log(text) {
    if (!fs.existsSync(process.env.LOG_FOLDERNAME)) {
        fs.mkdirSync(process.env.LOG_FOLDERNAME);
    }

    var date = new Date();
    const textToWrite = date.toLocaleString() + ' - ' + text;

    // Using filename as e.g. 4-15-2021.log.
    const filename = date.toLocaleDateString().replace(/\//g, "-") + ".log";
    fs.appendFile(process.env.LOG_FOLDERNAME + filename, textToWrite + '\n', function (err) {
        if (err) console.log(err.message);
    }); 
    console.log(textToWrite);
}

module.exports = Log;