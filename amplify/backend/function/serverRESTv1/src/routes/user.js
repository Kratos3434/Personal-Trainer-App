const express = require('express');
const router = express.Router();
const User = require('../controller/User');

router.post("/signin", User.login);

module.exports = router;