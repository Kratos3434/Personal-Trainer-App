const express = require('express');
const router = express.Router();
const User = require('../controller/User');
const Profile = require("../controller/Profile");
const FitnessUtils = require('../controller/FitnessUtils');

router.post("/signin", User.login);
router.post("/signup", User.signup);
router.get("/verify/:otp", User.verify);
router.post("/forgot", User.forgotPassword);
router.post("/signin/provider", User.loginWithProvider);
router.post("/profile/enter", Profile.saveProfile);
router.get("/result/:bodyMeasurementId", FitnessUtils.getFitnessResult);

module.exports = router;