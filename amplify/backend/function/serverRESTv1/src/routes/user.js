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
router.post("/profile/enter", Authorization.verifyToken, Profile.saveProfile);
router.get("/globalState", User.globalState);

//Verify if the users token is valid or if the user is quthorized
router.get("/authenticate", Authorization.verifyToken, (req, res) => res.status(200).json({status: true, message: "Authorized"}));

module.exports = router;