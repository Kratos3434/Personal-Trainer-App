const express = require('express');
const router = express.Router();
const Routine = require('../controller/Routine');
const DailyRoutine = require('../controller/DailyRoutine');

// Save Weekly Routine to db
router.post("/save", Routine.saveWeeklyRoutine);

// Get workout environment from db
router.get("/workoutEnv", Routine.getWorkoutEnv);

// Get equipment status from db
router.get("/muscleGroup", Routine.getMuscleGroup);

// Get exercises with optional params
router.get("/exercise", Routine.getExercises);

// Get DailyRoutine with DailyRoutineId;
router.get("/dailyRoutine/:dailyRoutineId", DailyRoutine.getDailyRoutine);

// Get One Exercise for Refresh
router.get("/getOneExercise", DailyRoutine.refreshOneExercise)

module.exports = router;