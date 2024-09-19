const { Request, Response } = require('express');
const prisma = require('../prismaInstance');
const Email = require('./Email');
const randomString = require('randomstring');

class Otp {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async send(req, res) {
        const { email } = req.params;
        try {
            if (!email) throw "Email is missing";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (!user) return res.status(200).json({status: true, data: null, message: "Otp sent"});

            const userOtp = await prisma.oTP.findUnique({
                where: {
                    userId: user.id
                },
                include: {
                    userAccount: {
                        select: {
                            verified: true
                        }
                    }
                }
            });

            if (!userOtp) throw "User does not exist";
            //if (userOtp.userAccount.verified) throw "User is already verified";
            if (userOtp.userAccount.verified) {
                if (!Otp.isTenMinutesOld(userOtp.createdAt)) return res.status(200).json({status: true, data: null, message: "Otp sent below ten minutes"});
            } else {
                if (!Otp.isOneDayOld(userOtp.createdAt)) throw "Please check your inbox for the OTP";
            }

            const otp = randomString.generate({
                length: 6,
                charset: 'numeric'
            });

            await prisma.oTP.update({
                where: {
                    userId: user.id
                },
                data: {
                    otp,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            if (userOtp.userAccount.verified) {
                await Email.sendForgotOtp(email, otp);
            } else {
                await Email.sendOtp(email, otp);
            }

            res.status(200).json({status: true, data: null, message: "Otp sent"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Date} date 
     */
    static isOneDayOld(date) {
        const currentDate = new Date();
        const diffInMs = currentDate - date;

        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        return diffInDays >= 1;
    }

    /**
     * 
     * @param {Date} date 
     */
    static isTenMinutesOld(date) {
        const tenMinutesInMs = 10 * 60 * 1000;
        const now = new Date();
        const difference = now - date;

        return difference >= tenMinutesInMs;
    }
}

module.exports = Otp;