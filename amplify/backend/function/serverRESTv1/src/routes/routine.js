const express = require('express');
const router = express.Router();
const Routine = require('../controller/Routine');
const DailyRoutine = require('../controller/DailyRoutine');
const Algorithm = require('../controller/Algorithm');

// Save Weekly Routine to db
router.post("/save", Routine.saveWeeklyRoutine);

// Get workout environment from db
router.get("/workoutEnv", Routine.getWorkoutEnv);

// Get Exercise string Description by exerciseId
router.get("/exerciseDescription/:exerciseId", Routine.getExerciseDescByExerciseId);

// Get equipment status from db
router.get("/muscleGroup", Routine.getMuscleGroup);

// Get exercises with optional params
router.get("/exercise", Routine.getExercises);

// Get DailyRoutine with DailyRoutineId;
router.get("/dailyRoutine/:dailyRoutineId", DailyRoutine.getDailyRoutine);

// Get One Exercise for Refresh
router.get("/getOneExercise", DailyRoutine.refreshOneExercise);

router.put("/updateDailyRoutine", DailyRoutine.updateDailyRoutine);

// Get recommended routine through algorithm
router.get("/recommendation", Algorithm.getRecommendation);

module.exports = router;