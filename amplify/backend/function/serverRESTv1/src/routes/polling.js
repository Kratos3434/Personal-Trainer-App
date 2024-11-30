const express = require("express");
const router = express.Router();
const Polling = require("../controller/Polling");

// Get logs from Algorithm.js
router.get("/logs", Polling.getLogs);

module.exports = router;
