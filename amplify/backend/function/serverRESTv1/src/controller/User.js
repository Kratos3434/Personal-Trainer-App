const prisma = require('../prismaInstance');
const { Request, Response } = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const randomString = require('randomstring');
const Email = require('./Email');
const Otp = require('./Otp');

class User {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async login(req, res) {
        const { email, password } = req.body;
        try {
            if (!email) throw "Email is required";
            if (!password) throw "Password is required";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (!user) throw "Incorrect email or password";
            //Check for the provider
            if (user.provider) throw "Incorrect email or password";

            const result = await bcrypt.compare(password, user.password);

            if (!result) throw "Incorrect email or password";

            const profile = await prisma.profile.findUnique({
                where: {
                    userId: user.id
                },
                include: {
                    userAccount: {
                        select: {
                            email: true
                        }
                    }
                }
            });

            if (!user.verified) {
                return res.status(401).json({
                    status: false,
                    error: "Account not verified, please check your inbox for the OTP code",
                    verified: false,
                    data: profile
                });
            }

            const privateKey = fs.readFileSync('privateKey.key');

            const token = jwt.sign({email: user.email, id: user.id}, privateKey, {
                expiresIn: '30 days',
                algorithm: 'RS256'
            });

            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 2629743744,
                secure: true
            });

            res.status(200).json({status: true, data: profile, message: "Log in successful"});
        } catch (err) {
            console.log(err)
            res.status(400).json({status: false, error: err, verified: true});
        }   
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async signup(req, res) {
        const { email, password, password2, firstName, lastName, dob, gender } = req.body;
        try {
            if (!email) throw "Email is required";
            if (!password) throw "password is required";
            if (!password2) throw "Please confirm your password";
            if (!firstName) throw "First name is required";
            if (!lastName) throw "Last name is required";
            if (!dob) throw "Date of birth is required";
            if (!(new Date(dob) instanceof Date && !isNaN(new Date(dob)))) throw "Date of birth is not valid";
            if (!gender) throw "Gender is required";
            if (password !== password2) throw "Passwords do not match";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (user) throw "Email already exists";

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await prisma.userAccount.create({
                data: {
                    email,
                    password: hashedPassword
                }
            });

            await prisma.profile.create({
                data: {
                    firstName,
                    lastName,
                    dob: new Date(dob),
                    gender,
                    userId: newUser.id
                }
            });

            //!TODO: Generate a unique code to send to the user's email
            const otp = randomString.generate({
                length: 6,
                charset: 'numeric'
            });

            await prisma.oTP.create({
                data: {
                    otp: otp,
                    userId: newUser.id
                }
            });

            await Email.sendOtp(email, otp);
            /////

            res.status(200).json({status: true, data: null, message: "Sign up successful"});
        } catch (err) {
            console.log(err);
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async verify(req, res) {
        const { otp } = req.params;
        try {
            if (!otp) throw "Otp is missing";

            const userOtp = await prisma.oTP.findUnique({
                where: {
                    otp
                },
                include: {
                    userAccount: {
                        select: {
                            verified: true
                        }
                    }
                }
            });

            if (!userOtp) throw "Invalid Otp";
            if (userOtp.userAccount.verified) throw "User is already verified";

            if (Otp.isOneDayOld(userOtp.createdAt)) throw "This Otp have expired";

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate()-1);

            await prisma.userAccount.update({
                where: {
                    id: userOtp.userId
                },
                data: {
                    verified: true,
                    updatedAt: new Date(),
                    createdAt: yesterday
                }
            });

            res.status(200).json({status: true, data: null, message: "User verified"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async forgotPassword(req, res) {
        const { password, password2, otp } = req.body;
        try {
            if (!password) throw "Password is missing";
            if (!password2) throw "Please confirm your password";
            if (password !== password2) throw "Passwords to not match";
            if (!otp) throw "Otp is missing";

            const userOtp = await prisma.oTP.findUnique({
                where: {
                    otp
                }
            });

            if (!userOtp) throw "Invalid Otp";

            if (Otp.isTenMinutesOld(userOtp.createdAt)) throw "This otp have expired";

            const hashedPassword = await bcrypt.hash(password, 10);

            await prisma.userAccount.update({
                where: {
                    id: userOtp.userId
                },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            });


            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate()-1);

            await prisma.oTP.update({
                where: {
                    otp
                },
                data: {
                    createdAt: yesterday,
                    updatedAt: new Date()
                }
            });

            res.status(200).json({status: true, data: null, message: "Password changed successfuly"});

        } catch (err) { 
            res.status(400).json({status: false, error: err});
        }
    }
}

module.exports = User;