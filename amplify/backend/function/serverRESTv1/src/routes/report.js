const express = require("express");
const router = express.Router();
const Report = require("../controller/Report");

router.get("/getReport/:id", Report.getReport);

module.exports = router;
