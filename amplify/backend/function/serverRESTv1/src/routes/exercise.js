const express = require("express");
const router = express.Router();
const Exercise = require("../controller/Exercise");
const Authorization = require("../controller/Authorization");

router.post("/create", Authorization.verifyAdmin, Exercise.create);

module.exports = router;
