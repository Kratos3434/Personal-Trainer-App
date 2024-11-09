const express = require('express');
const router = express.Router();
const { WeeklyProgress } = require('../controller/WeeklyProgress');

// Save weekly progress data to db
router.post('/save', WeeklyProgress.saveWeeklyProgress);

// Get all progress entries associated with the user's profile
router.get('/', WeeklyProgress.getProgressByProfile);

// Get progress results for the completed routine
router.get('/results', WeeklyProgress.getProgressResults);

// Get progress from db
router.get('/:progressId', WeeklyProgress.getProgressById);


module.exports = router;