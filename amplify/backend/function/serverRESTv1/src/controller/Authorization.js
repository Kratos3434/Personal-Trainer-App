const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Request, Response, NextFunction } = require('express');

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

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next
     */
    static verifyToken(req, res, next) {
        try {
            const bearerToken = req.headers.authorization;
            if (!bearerToken) throw "Unauthorized";

            const result = Authorization.decodeToken(bearerToken);

            if (!result) throw "Unauthorized";

            next();
        } catch (err) {
            res.status(401).json({status: false, error: err});
        }
    }
}

module.exports = Authorization;