const prisma = require('../prismaInstance');

class DailyRoutine {

    static async getDailyRoutine(req, res) {
        const { dailyRoutineId } = req.params;

        try {
            if (!dailyRoutineId) {
                return res.status(400).json({ message: "dailyRoutineId is required" });
            }

            const exerciseDetails = await prisma.exerciseDetails.findMany({
                where: {
                    dailyRoutineId: Number(dailyRoutineId),
                },
                include: {
                    exercise: {
                        include: {
                            workoutEnvironments: {
                                include: {
                                    workoutEnvironment: true,
                                },
                            },
                            muscleGroups: {
                                include: {
                                    muscleGroup: true,
                                },
                            },
                            level: true, 
                            requiredEquipment: true,
                        },
                    },
                },
            });

            console.log(JSON.stringify(exerciseDetails, null, 3)); // For debugging.

            res.status(200).json({status: true, data: exerciseDetails, message: "DailyRounte Successfuly Retrieved"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

    static async saveDailyRoutine(req, res) {
        const { dailyRoutine, exerciseDetails } = req.body;
        try {

            if (!dailyRoutine) throw "Daily Routine object is required";
            if (!exerciseDetails) throw "Exercise Detail object is required";


            // Start transaction (Objects only save to the db when no errors occur during the entire process)
            const result = await prisma.$transaction(async (prisma) => {
                
                /* Update Daily Routine <May Not Needed>
                const updatedRoutine = await prisma.dailyRoutine.update({
                    where: { id: dailyRoutine.dailyRoutineId }, // Specify the ID of the routine to update
                    data: {
                        dayNumber: dailyRoutine.dayNumber, // Update dayNumber
                        weeklyRoutineId: dailyRoutine.weeklyRoutineId, // Update weeklyRoutineId
                    },
                });

                console.log(updatedRoutine); // Debugging
                */


                // update Exercise Details for each daily routine (Multiple)
                for (let exercise of dailyRoutine.exerciseDetails) {
                    await prisma.exerciseDetails.update({
                        where: {
                            id: exercise.id
                        },
                        data: {
                            dailyRoutineId: dailyRoutine.dailyRoutineId,  // link to daily routine
                            exerciseId: exercise.exerciseId,
                            sets: exercise.sets,
                            reps: exercise.reps,
                            youtubeURL: exercise.youtubeURL,
                        },
                    });
                }
                  
            });   
            
            res.status(200).json({ status: true, data: result, message: "Daily Routine Updated successfully" });
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }

    }

    static async refreshOneExercise(req, res) {
        try {
            const { name, minIntensity, maxIntensity, levelId, requiredEquipmentId, workoutEnvironmentId, muscleGroups } = req.query;

            // Build query object
            const queryConditions = {};

            if (name) {
                queryConditions.name = {
                    contains: name,
                    mode: 'insensitive', // Case-insensitive search
                };
            }
            if (minIntensity) {
                queryConditions.intensity = {
                    gte: Number(minIntensity), 
                };
            }
            if (maxIntensity) {
                queryConditions.intensity = {
                    lte: Number(maxIntensity),
                };
            }
            if (levelId) {
                queryConditions.levelId = Number(levelId);
            }
            if (requiredEquipmentId) {
                queryConditions.requiredEquipmentId = Number(requiredEquipmentId);
            }
            // Search exercises with multiple workoutEnvironments
            if (workoutEnvironmentId) {
                const workoutEnvArray = Array.isArray(workoutEnvironmentId) ? workoutEnvironmentId.map(Number) : [Number(workoutEnvironmentId)];
                queryConditions.workoutEnvironments = {
                    some: {
                        workoutEnvironmentId: {
                            in: workoutEnvArray,
                        },
                    },
                };
            }
            // Search exercises with multiple muscleGroups
            if (muscleGroups) {
                const muscleGroupArray = typeof muscleGroups === 'string'
                    ? muscleGroups.split(',').map(Number)
                    : [Number(muscleGroups)];

                queryConditions.muscleGroups = {
                    some: { muscleGroupId: { in: muscleGroupArray } },
                };
            }

            // Fetch exercises with the constructed query
            const exercises = await prisma.exercise.findMany({
                where: queryConditions,
                include: {
                    workoutEnvironments: {
                        include: {
                            workoutEnvironment: true,
                        },
                    },
                    muscleGroups: {
                        include: {
                            muscleGroup: true,
                        },
                    },
                    level: true, 
                    requiredEquipment: true,
                },
            });

            if (!exercises.length) throw "No exercises found matching the criteria";
            
            // Choose one random exercise among all the exercises
            const randomNum = Math.floor(Math.random() * exercises.length);
            const exercise = exercises[randomNum]
            console.log(exercise)

            return res.status(200).json(exercise);
        } catch (error) {
            console.error("Error fetching exercises:", error);
            return res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }
}

module.exports = DailyRoutine;