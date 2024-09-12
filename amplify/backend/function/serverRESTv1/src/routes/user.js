const express = require('express');
const router = express.Router();
const User = require('../controller/User');

router.post("/signin", User.login);
router.post("/signup", User.signup);
router.get("/verify/:otp", User.verify);

module.exports = router;