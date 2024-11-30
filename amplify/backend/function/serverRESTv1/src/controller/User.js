const prisma = require('../prismaInstance');
const { Request, Response } = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const randomString = require('randomstring');
const Email = require('./Email');
const Otp = require('./Otp');
const Authorization = require('./Authorization');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

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
                            email: true,
                            stripeId: true
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
        const { email, password, password2, firstName, lastName } = req.body;
        try {
            if (!email) throw "Email is required";
            if (!password) throw "password is required";
            if (!password2) throw "Please confirm your password";
            if (!firstName) throw "First name is required";
            if (!lastName) throw "Last name is required";
            // if (!dob) throw "Date of birth is required";
            // if (!(new Date(dob) instanceof Date && !isNaN(new Date(dob)))) throw "Date of birth is not valid";
            // if (!gender) throw "Gender is required";
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

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async loginWithProvider(req, res) {
        const { email, provider, name } = req.body;
        try {
            if (!email) throw "Email is required";
            if (!provider) throw "Provider is required";
            if (!name) throw "Name is required";
            
            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            //if user exists, send a token for login
            if (user) {
                const userProfile = await prisma.profile.findUnique({
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

                return res.status(200).json({status: true, data: userProfile, message: "Login successful"});

            }

            const splitName = name.split(" ");
            const firstName = splitName[0];
            const lastName = splitName[splitName.length -1];

            const newUser = await prisma.userAccount.create({
                data: {
                    email,
                    verified: true,
                    password: "xxxxxxxxx",
                    provider
                }
            });

            const newUserProfile = await prisma.profile.create({
                data: {
                    firstName,
                    lastName,
                    userId: newUser.id
                }
            });

            const privateKey = fs.readFileSync('privateKey.key');

            const token = jwt.sign({email: newUser.email, id: newUser.id}, privateKey, {
                expiresIn: '30 days',
                algorithm: 'RS256'
            });
    
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 2629743744,
                secure: true
            });

            res.status(200).json({status: true, data: newUserProfile, message: "New user created"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }   
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async createPaymentMethodWithSubscription(req, res) {
        const { paymentMethodId } = req.body;
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const email = decoded.email;
            const id = decoded.id;

            if (!email) throw "Email is missing from token";
            if (!paymentMethodId) throw "Payment method id is required";

            const profile = await prisma.profile.findUnique({
                where: {
                    userId: +id
                }
            });

            if (!profile) throw "Cannot find profile with the token";

            const newCustomer = await stripe.customers.create({
                name: `${profile.firstName} ${profile.lastName}`,
                email: email,
                payment_method: paymentMethodId,
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            const subscription = await stripe.subscriptions.create({
                customer: newCustomer.id,
                items: [
                    {
                        price: 'price_1QN47qALN5ZJppZ0kdzc8AtO'
                    }
                ],
                //expand: ['latest_invoice.payment_intent']
            });

            //add the stripe id into the user account
            await prisma.userAccount.update({
                where: {
                    id: profile.userId
                },
                data: {
                    stripeId: newCustomer.id
                }
            })

            res.status(200).json({
                status: true,
                message: "Creating new customer and subscription successful",
                data: {
                    subscription,
                }
            })
        } catch (err) {
            console.log(err);
            res.status(400).json({status: false, error: "Something went wrong while processing payment"});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async isSubscriptionActive(req, res) {
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const email = decoded.email;

            if (!email) throw "Email is not present in the token";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (!user) throw "User does not exist";

            const subscriptions = await stripe.subscriptions.list({
               customer: user.stripeId
            });

            if (subscriptions.data.length === 0) throw "No active subscriptions for this user";

            const subId = subscriptions.data[0].id;

            //Get the subscription status
            const subscription = await stripe.subscriptions.retrieve(subId);

            if (!subscription) throw "Subscription does not exist";
            let isActive = false;

            if (subscription.status === 'active') {
                isActive = true;
            } else if (subscription.status === 'trialing') {
                isActive = true;
            } else if (subscription.status === 'canceled') {
                if (subscription.cancel_at_period_end) {
                    isActive = true;
                } else {
                    isActive = false;
                }
            }

            res.status(200).json({status: true, data: {isActive}});

        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async cancelSubscription(req, res) {
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const email = decoded.email;

            if (!email) throw "Email is not present in the token";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (!user) throw "User does not exist";

            const subscriptions = await stripe.subscriptions.list({
               customer: user.stripeId,
               status: 'active'
            });

            if (subscriptions.data.length === 0) throw "No active subscriptions for this user";

            const subId = subscriptions.data[0].id;

            const cancelSub = await stripe.subscriptions.update(subId, {
                cancel_at_period_end: true
            });

            if (!cancelSub) throw "Something went wrong while cancelling subscription";

            const endDate = new Date(cancelSub.current_period_end * 1000);

            res.status(200).json({status: true, messsage: "Subscription successfully canceled", data: {endDate}})
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async renewSubscription(req, res) {
        const { paymentMethodId } = req.body;
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const email = decoded.email;
            const id = decoded.id;

            if (!email) throw "Email is missing from token";
            if (!paymentMethodId) throw "Payment method id is required";

            const profile = await prisma.profile.findUnique({
                where: {
                    userId: +id
                },
                include: {
                    userAccount: {
                        select: {
                            stripeId: true
                        }
                    }
                }
            });

            if (!profile) throw "Cannot find profile with the token";

            const subscription = await stripe.subscriptions.create({
                customer: profile.userAccount.stripeId,
                items: [
                    {
                        price: 'price_1QN47qALN5ZJppZ0kdzc8AtO'
                    }
                ],
            });

            if (!subscription) throw "Something went wrong when renewing the subscription";

            res.status(200).json({status: true, message: "Subscription renewed"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async getPaymentMethods(req, res) {
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const email = decoded.email;

            if (!email) throw "Email is not present in the token";

            const user = await prisma.userAccount.findUnique({
                where: {
                    email
                }
            });

            if (!user) throw "User does not exist";

            const paymentMethods = await stripe.paymentMethods.list({
                customer: user.stripeId
            });

            res.status(200).json({status: true, message: "List of payment methods", data: paymentMethods.data});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }
}

module.exports = User;