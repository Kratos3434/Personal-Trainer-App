const express = require("express");
const router = express.Router();
const MuscleGroupJunction = require("../controller/MuscleGroupJunction");
const Authorization = require("../controller/Authorization");

router.post("/create", Authorization.verifyAdmin, MuscleGroupJunction.create);

module.exports = router;
