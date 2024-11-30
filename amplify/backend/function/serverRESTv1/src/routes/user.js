const express = require('express');
const router = express.Router();
const User = require('../controller/User');
const Profile = require("../controller/Profile");
const Authorization = require('../controller/Authorization');

router.post("/signin", User.login);
router.post("/signup", User.signup);
router.get("/verify/:otp", User.verify);
router.post("/forgot", User.forgotPassword);
router.post("/signin/provider", User.loginWithProvider);
router.get("/profile", Authorization.verifyToken, Profile.getByToken);
router.patch("/profile/update", Authorization.verifyToken, Profile.update);
router.post("/profile/enter", Authorization.verifyToken, Profile.saveProfile);
router.put("/profile/updateIntensityAndLevel", Authorization.verifyToken, Profile.updateIntensityAndLevel);
router.post("/subscribe", Authorization.verifyToken, User.createPaymentMethodWithSubscription);
router.get("/subscription/status", Authorization.verifyToken, User.isSubscriptionActive);
router.patch("/subscription/cancel", Authorization.verifyToken, User.cancelSubscription);
router.get("/payment-methods", Authorization.verifyToken, User.getPaymentMethods);
router.post("/subscription/renew", Authorization.verifyToken, User.renewSubscription);

//Verify if the users token is valid or if the user is quthorized
router.get("/authenticate", Authorization.verifyToken, Profile.getByToken);

module.exports = router;