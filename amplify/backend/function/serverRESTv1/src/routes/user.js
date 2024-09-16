const express = require('express');
const router = express.Router();
const User = require('../controller/User');

router.post("/signin", User.login);
router.post("/signup", User.signup);
router.get("/verify/:otp", User.verify);
router.post("/forgot", User.forgotPassword);
router.post("/signin/provider", User.loginWithProvider);

module.exports = router;