const express = require('express');
const router = express.Router();
const Video = require('../controller/Video');

router.get("/random/:exerciseId", Video.getByExerciseIdRandom);

module.exports = router;