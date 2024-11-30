const express = require("express");
const router = express.Router();
const Routine = require("../controller/CurrentRoutine");

// Get Current Week's Routine from db
router.get("/fetch", Routine.getCurrentWeeklyRoutine);

module.exports = router;
