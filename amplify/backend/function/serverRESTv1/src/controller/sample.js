const {Request, Response} = require('express');

class Sample {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static getHelloMessage(req, res) {
        try {
            res.status(200).json({status: true, message: "Hello"});
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static getHelloFromDevBranch(req, res) {
        try {
            res.status(200).json({status: true, message: "Hello from development branch"});
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    }
}

module.exports = Sample;