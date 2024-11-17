const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");

class Routine {
    /**
     * Method to save the frontend generated WeeklyRoutine, DailyRoutines, and ExerciseDetails to the db.
     * @param {Request} req 
     * @param {Response} res 
     */
    static async saveWeeklyRoutine(req, res) {
        try {
            let { weeklyRoutine, dailyRoutines } = req.body;

            if (!weeklyRoutine) throw "Weekly Routine object is required";
            if (!dailyRoutines) throw "Daily Routine(s) object is required";

            const decoded = Authorization.decodeToken(req.headers.authorization);
            const userId = decoded.id;

            // Get the current user's profileId
            const profile = await prisma.profile.findUnique({
                where: {
                    userId: userId
                },
                select: {
                    id: true
                }
            });

            if (!profile) throw "Profile does not exist";

            // Start transaction (Objects only save to the db when no errors occur during the entire process)
            const result = await prisma.$transaction(async (prisma) => {
                
                // Save Weekly Routine (Single object)
                const savedWeeklyRoutine = await prisma.weeklyRoutine.create({
                    data: {
                        startDate: weeklyRoutine.startDate,
                        endDate: weeklyRoutine.endDate,
                        daysPerWeek: weeklyRoutine.daysPerWeek,
                        workoutEnvironmentId: weeklyRoutine.workoutEnvironmentId,
                        profileId: profile.id // link to profile ID
                    },
                });

                if (!savedWeeklyRoutine.id) throw "Weekly Routine creation failed";

                // Save Daily Routines (Multiple)
                for (let dailyRoutine of dailyRoutines) {
                    const savedDailyRoutine = await prisma.dailyRoutine.create({
                        data: {
                            dayNumber: dailyRoutine.dayNumber,
                            weeklyRoutineId: savedWeeklyRoutine.id,  // link to weekly routine
                        },
                    });

                    if (!savedDailyRoutine.id) throw "Daily Routine creation failed";
            
                    // Save Exercise Details for each daily routine (Multiple)
                    for (let exercise of dailyRoutine.exerciseDetails) {
                        await prisma.exerciseDetails.create({
                            data: {
                                dailyRoutineId: savedDailyRoutine.id,  // link to daily routine
                                exerciseId: exercise.exerciseId,
                                sets: exercise.sets,
                                reps: exercise.reps,
                                minutes: exercise.minutes,
                                youtubeURL: exercise.youtubeURL,
                                thumbnailURL: exercise.thumbnailURL
                            },
                        });
                    }
                }  
            });   
            
            res.status(200).json({ status: true, data: result, message: "Routine saved successfully" });

        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    };

    /**
     * Method to fetch workout environment from the db.
     * @param {Request} req 
     * @param {Response} res 
     * @returns workoutEnvironment[]
     */
    static async getWorkoutEnv(req, res) {
        try {
            const workoutEnv = await prisma.workoutEnvironment.findMany({
                select: {
                    id: true,
                    description: true
                }
            });

            if (!workoutEnv) throw "No workout environment found";

            return res.status(200).json(workoutEnv);
        } catch (error) {
            console.error("Error fetching Workout Environment:", error);
            return res.status(500).json({ message: "Internal server error", error: error.message });
        }
    };

    /**
     * Method to fetch description of workout environment, type, equipment, and level for the frontend.
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    static async getExerciseDescByExerciseId(req, res) {
        let { exerciseId } = req.params;

        try {
            // Get the exercise details
            const exercise = await prisma.exercise.findUnique({
                where: {
                    id: parseInt(exerciseId)
                }
            });

            if (!exercise) throw "No exercise found";

            // Get the environment description
            const workoutEnv = await prisma.workoutEnvironmentJunction.findMany({
                where: {
                    exerciseId: parseInt(exercise.id)
                },
                include: {
                    workoutEnvironment: true,
                },
            });

            if (!workoutEnv) throw "No workout environment found";

            // Get the exercise type description
            const type = await prisma.exerciseType.findUnique({
                where: {
                    id: exercise.typeId
                }
            });

            if (!type) throw "No type found";

            // Get the equipment description
            const equipment = await prisma.requiredEquipment.findUnique({
                where: {
                    id: exercise.requiredEquipmentId
                }
            });

            if (!equipment) throw "No required equipment found"

            // Get the level description
            const level = await prisma.level.findUnique({
                where: {
                    id: exercise.levelId
                }
            });

            if (!level) throw "No level info found"

            const result = workoutEnv.map(env => ({
                workoutEnvId: env.workoutEnvironment.id,
                envDescription: env.workoutEnvironment.description,
                typeId: type.id,
                typeDescription: type.description,
                equipmentId: equipment.id,
                equipmentDescription: equipment.description,
                levelId: level.id,
                levelDescription: level.description
            }));

            return res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching Workout Environment:", error);
            return res.status(500).json({ message: "Internal server error", error: error.message });
        }
    };

    /**
     * Method to fetch Muscle Groups from the db.
     * @param {Request} req 
     * @param {Response} res 
     * @returns muscleGroup[]
     */
    static async getMuscleGroup(req, res) {
        try {
            const muscleGroup = await prisma.muscleGroup.findMany({
                select: {
                    id: true,
                    description: true
                }
            });

            if (!muscleGroup) throw "No muscle group found";

            return res.status(200).json(muscleGroup);
        } catch (error) {
            console.error("Error fetching Muscle Group:", error);
            return res.status(500).json({ message: "Internal server error", error: error.message });
        }
    };

    /**
     * Method to fetch exercises with custom params from db. All params are optional. 
     * @param {Request} req 
     * @param {Response} res 
     * @returns exercise[]
     */
    static async getExercises(req, res) {
        // Accept both http req or object
        const isHttpRequest = req && req.query !== undefined;        

        try {    
            const { name, typeId, minIntensity, maxIntensity, levelId, requiredEquipmentId, workoutEnvironmentId, muscleGroups } = isHttpRequest ? req.query : req;

            // Build query object
            const queryConditions = {};

            if (name) {
                queryConditions.name = {
                    contains: name,
                    mode: 'insensitive', // Case-insensitive search
                };
            }
            if (typeId) {
                queryConditions.typeId = Number(typeId);
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
                    muscleGroups: true,
                },
            });

            if (!exercises.length) throw `No exercises found matching the criteria: ${isHttpRequest ? JSON.stringify(req.query) : JSON.stringify(req)}`;

            return isHttpRequest ? res.status(200).json(exercises) : exercises;
        } catch (error) {
            console.error(`\n${error}`);
            return isHttpRequest ? res.status(500).json({ message: "Internal server error", error: error.message }) : { message: "Internal server error", error: error.message };
        }
    };
}

module.exports = Routine;