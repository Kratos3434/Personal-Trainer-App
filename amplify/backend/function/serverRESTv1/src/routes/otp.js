const express = require('express');
const router = express.Router();
const Otp = require('../controller/Otp');

router.get("/send/:email", Otp.send);

module.exports = router;