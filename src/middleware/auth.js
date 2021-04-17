const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const jwt = require('jsonwebtoken');
const Log = require('./logger').Log;

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if (err) {
                Log(`AUTHORIZATION: User failed authentication while accessing '${req.path}'.`, 'warning');
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        Log(`AUTHORIZATION: User sent a request without an Authorization header to ${req.path}.`, 'warning');
        return res.sendStatus(401);
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role != 'admin') {
        Log(`AUTHORIZATION: User ${req.user.username} (role: ${req.user.role}) has failed to access an admin-exclusive method`, 'warning');
        return res.sendStatus(403);
    }
    next();
}

module.exports = { isAdmin, authenticateJWT };
