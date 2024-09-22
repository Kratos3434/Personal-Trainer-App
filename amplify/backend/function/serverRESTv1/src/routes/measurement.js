const express = require('express');
const router = express.Router();
const BodyMeasurement = require('../controller/BodyMeasurement');
const Authorization = require('../controller/Authorization');
const FitnessUtils = require('../controller/FitnessUtils');

// Save body measurement data to db
router.post("/save", BodyMeasurement.saveBodyMeasurement);

// Get fitness result from saved body measurement data
router.get("/result/:bodyMeasurementId", Authorization.verifyToken, FitnessUtils.getFitnessResult);

module.exports = router;