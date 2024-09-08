const express = require('express');
const router = express.Router();
const Sample = require('../controller/sample');

router.get("/hello", Sample.getHelloMessage);

module.exports = router;