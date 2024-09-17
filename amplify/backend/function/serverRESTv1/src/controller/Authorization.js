const fs = require('fs');
const jwt = require('jsonwebtoken');
class Authorization {
    /**
     * 
     * @param {string} bearerToken 
     */
    static decodeToken(bearerToken) {
        if (bearerToken === "undefined" || !bearerToken) {
            throw "Bearer toke is missing";
        }

        const token = bearerToken.split(' ')[1];

        const privateKey = fs.readFileSync('privateKey.key');

        return jwt.verify(token, privateKey);
    } 
}

module.exports = Authorization;