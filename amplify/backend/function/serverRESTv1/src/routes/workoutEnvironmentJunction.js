const express = require('express');
const router = express.Router();
const WorkoutEnvironmentJunction = require('../controller/WorkoutEnvironmentJunction');
const Authorization = require('../controller/Authorization');

router.post("/create", Authorization.verifyAdmin, WorkoutEnvironmentJunction.create);

module.exports = router;