const prisma = require('../prismaInstance');
const { decodeToken } = require("./Authorization");
const FitnessUtils = require('./FitnessUtils');
const Authorization = require('./Authorization');
const Routine = require('./Routine');
const Video = require('./Video');
const Polling = require('./Polling');

class Algorithm {
    /**
     * The algorithm to produce recommended daily routines based on user's current and historical fitness data.
     * @param {Request} req 
     * @param {Response} res 
     * @returns dailyRoutines
     */
    static async getRecommendation(req, res) {

        // Clear analysis logs
        Polling.clearLogs();
        
        try {
            const { daysPerWeek, workoutEnvironmentId } = req.query;

            // Get user profile
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const userId = decoded.id;            
            const profile = await prisma.profile.findUnique({
                where: {
                    userId: userId
                }
            });

            if (!profile) throw "Profile does not exist";
            Polling.addLog("Analyzing profile...\n");            
            
            //Get the latest 4 progress            
            const latestProgress = await prisma.weeklyProgress.findMany({
                where: {
                    profileId: profile.id
                },
                orderBy: {
                    date: 'desc'
                },
                take: 4 // get the most recent 4 progress records
            });

            // Get the latest measurement from the latest Progress
            let latestMeasurement;
            if (latestProgress.length > 0) {
                latestMeasurement = await prisma.bodyMeasurement.findUnique({
                    where: {
                        id: latestProgress[0].bodyMeasurementId
                    }
                })

            // If no weekly progress exists, fetch with initialBodyMeasurementId instead
            } else {
                latestMeasurement = await prisma.bodyMeasurement.findUnique({
                    where: {
                        id: profile.bodyMeasurementId
                    }
                })
            }

            // Get all required user values and classifications
            const age = FitnessUtils.getAgeFromDob(profile.dob);
            const gender = profile.gender;
            const levelId = profile.levelId;
            let intensityId = profile.intensityId;
            const bodyFatClassification = FitnessUtils.getClassificationResult(latestMeasurement.bodyFatPercent, age, profile.gender);            
            const ffmi = FitnessUtils.getFFMI(profile.height, latestMeasurement.weight, latestMeasurement.bodyFatPercent);
            const ffmiClassification = FitnessUtils.getFFMIClassification(ffmi, profile.gender);

            Polling.addLog(`Analyzing your fitness ratings:\nBody Fat: "${bodyFatClassification}", FFMI: "${ffmiClassification}"\n`);
            Polling.addLog(`Analyzing your age group: ${age} yrs old...\n`);

            // Logic 1: Override and decrease intensityId by 1 if user's age is above 50
            if (age > 50 && intensityId > 1) {
                intensityId = intensityId - 1;
                Polling.addLog(`Age over 50, decreasing intensity...\n`);
            } else if (age < 18 && intensityId > 1) {
                Polling.addLog(`Age under 18, decreasing intensity...\n`);
                intensityId = intensityId - 1;
            }

            // Logic 2: Set the maximum exercises per day by Intensity
            const maxExercisesPerDay = intensityId === 1 ? 4 : intensityId === 2 ? 5 : intensityId === 3 ? 6 : 7;
            Polling.addLog(`Setting the number of daily exercises based on your fitness level...\n`);

            // Logic 3: Select a base plan based on the user's gender and classifications
            // Option 1: Above average body fat, go with Fat Loss plan according to gender
            let selectedBasePlan = null;
            if (["Average", "Below Average", "Poor"].includes(bodyFatClassification)) {
                selectedBasePlan = Algorithm.basePlans.find(plan =>
                    plan.title === "Fat Loss" && plan.gender === gender
                );

            // Option 2: Below average body fat, go with muscle building according to FFMI level and gender
            } else if (["Fit", "Athletes", "Essential Fat"].includes(bodyFatClassification)) {
                selectedBasePlan = Algorithm.basePlans.find(plan =>
                    plan.title === "Build Muscle" && plan.levelId === levelId && plan.gender === gender
                );
            } 

            if (!selectedBasePlan) {
                throw "Cannot find a suitable plan."
            } else {
                console.log(`Selected base plan: ${selectedBasePlan.title} for ${gender}, Level ${selectedBasePlan.levelId}`);
            }

            Polling.addLog(`Selecting the best workout plan for you: \n${selectedBasePlan.title} for ${gender === "M" ? "Male" : "Female"}, ${selectedBasePlan.levelId === 1 ? "Beginner" : selectedBasePlan.levelId === 2 ? "Intermediate" : "Advanced"} level\n`);

            // Logic 4: Shuffle the days in the base plan for variety
            const shuffledBasePlan = Algorithm.shuffleArray([...selectedBasePlan.days]);

            // Logic 5: If daysPerWeek is less than 3, select the most muscle groups involved days
            let selectedDays;
            if (daysPerWeek < 3) {
                selectedDays = shuffledBasePlan.sort((a, b) => {
                    const uniqueMusclesA = new Set(a.exercises.flatMap(ex => ex.muscleGroups)).size;
                    const uniqueMusclesB = new Set(b.exercises.flatMap(ex => ex.muscleGroups)).size;
                    return uniqueMusclesB - uniqueMusclesA;
                }).slice(0, daysPerWeek);
            } else {
                selectedDays = shuffledBasePlan.slice(0, daysPerWeek);
            }

            Polling.addLog(`Scheduling your daily routines based on a ${daysPerWeek}-day(s) period...\n`);

            // Logic 6: Calculate the last 4 weeks (or minimum 2 weeks) Body Fat and Body Mass changes on average
            let bodyFatDecreased;   // 3 states: undefined, true, false (mean different things)
            let bodyMassIncreased;  // 3 states: undefined, true, false (mean different things)
            if (latestProgress.length > 0 ) {
                ({ bodyFatDecreased, bodyMassIncreased } = await Algorithm.calculateBodyFatAndBodyMassChanges(latestProgress, bodyFatClassification, ffmiClassification));
                Polling.addLog(`Calculating your recent Body Fat and Body Mass changes...\n`);
            }

            // Daily Routine Creation: create based on daysPerWeek and selected days in a shuffled base plan
            Polling.addLog(`Fetching the best exercises that match your level and environment...\n`);
            
            const dailyRoutines = [];
            let modifyCardio = false;
            for (let i = 0; i < selectedDays.slice(0, daysPerWeek).length; i++) {

                // Need to do a shallow copy to avoid altering the source plan
                let day = { ...selectedDays[i], exercises: [...selectedDays[i].exercises] };

                // Logic 7: If user does not lose fat for the past 4 weeks (or minimum 2 weeks), add/modify cardio                
                if (bodyFatDecreased !== undefined && !bodyFatDecreased) {

                    // If no cardio exercise, add one
                    if (!day.exercises.some(ex => ex.muscleGroups.includes(12))) {
                        day.exercises.push({ muscleGroups: [12], typeId: 1 });
                    
                    // If there is cardio exercise, increase the duration
                    } else {
                        modifyCardio = true;
                    }                    
                } 

                // Logic 8: If bodyMassIncreased is false, increase reps by 2                
                let modifyReps = false;
                if (bodyMassIncreased !== undefined && !bodyMassIncreased) {
                    modifyReps = true;
                }

                // An empty Set to track selected exercises to avoid duplications within a day
                const usedExerciseIds = new Set();

                // Logic 9: Fetch exercises based on criteria until maxTries runs out
                const rawExerciseDetails = [];                
                for (const exercise of day.exercises) {
                    const exerciseCriteria = {
                        ...exercise,                                         // exercise criteria (typeId, muscle groups)
                        levelId: selectedBasePlan.levelId,                   // levelId
                        workoutEnvironmentId: parseInt(workoutEnvironmentId) // workoutEnv
                    };                    
                    
                    let exercises;
                    let maxTries = 5;
                    let foundExercise = false;

                    // Logic 10: If no exercises can be found based on the criteria, adjust the search criteria
                    while (maxTries > 0) {
                        exercises = await Routine.getExercises(exerciseCriteria);

                        // Check if exercises are found
                        if (Array.isArray(exercises) && exercises.length > 0) {

                            // Filter out used exercises and check for duplicates
                            const filteredExercises = exercises.filter(ex => !usedExerciseIds.has(ex.id));
                            
                            if (filteredExercises.length > 0) {

                                // Select a random exercise from the filtered exercises
                                const selectedExercise = filteredExercises[Math.floor(Math.random() * filteredExercises.length)];

                                // Add the selected exercise ID to the used Set
                                usedExerciseIds.add(selectedExercise.id);
                                
                                // Get video
                                const videoData = await Video.getByExerciseIdRandom({ exerciseId: selectedExercise.id });
                                const youtubeURL = videoData?.data?.url || `URL not found: ${ videoData.exerciseId }`;
                                const thumbnailURL = videoData?.data?.thumbnail || `Thumbnail not found: ${ videoData.exerciseId }`;

                                rawExerciseDetails.push({
                                    exerciseId: selectedExercise.id,
                                    sets: selectedExercise.defaultSets,
                                    reps: modifyReps ? selectedExercise.defaultReps + 2 : selectedExercise.defaultReps, // If modifyReps is true, increase 2 reps
                                    minutes: selectedExercise.minutes && modifyCardio ? selectedExercise.minutes * 2 : selectedExercise.minutes, // if modify cardio is true, x2 minutes
                                    youtubeURL: youtubeURL,
                                    thumbnailURL: thumbnailURL,
                                    name: selectedExercise.name, // For frontend display only
                                    muscleGroups: selectedExercise.muscleGroups.map(mg => mg.muscleGroupId), // For frontend display only
                                });

                                if (maxTries < 5) {
                                    console.log("Replacement found.");
                                }
                                
                                foundExercise = true; 
                                break; 
                            }
                        }

                        // Adjust search criteria if no valid exercises are found (max 5 times)
                        if (maxTries === 5) {
                            exerciseCriteria.typeId = exerciseCriteria.typeId === 1 ? 2 : 1;
                            console.log("First attempt: No matching exercises found, switching typeId: ", exerciseCriteria);
                        } else if (maxTries === 4 && exerciseCriteria.levelId > 1) {
                            exerciseCriteria.typeId = exerciseCriteria.typeId === 1 ? 2 : 1;  // switch back typeId
                            exerciseCriteria.levelId -= 1;
                            console.log("Second attempt: No matching exercises found, lowering levelId: ", exerciseCriteria);
                        } else if (maxTries === 3) {
                            exerciseCriteria.typeId = exerciseCriteria.typeId === 1 ? 2 : 1; 
                            console.log("Third attempt: No matching exercises found, switching typeId: ", exerciseCriteria);
                        } else if (maxTries === 2 && exerciseCriteria.levelId > 1) {
                            exerciseCriteria.typeId = exerciseCriteria.typeId === 1 ? 2 : 1;  // switch back typeId
                            exerciseCriteria.levelId -= 1;
                            console.log("Fourth attempt: No matching exercises found, lowering levelId: ", exerciseCriteria);
                        } else if (maxTries === 1 && exerciseCriteria.levelId > 1) {
                            exerciseCriteria.typeId = exerciseCriteria.typeId === 1 ? 2 : 1;
                            console.log("Fifth attempt: No matching exercises found, switching typeId: ", exerciseCriteria);
                        }
                        maxTries--;
                    }

                    // If no exercises were found after attempts, push null
                    if (!foundExercise) {
                        console.log(`Failed fetching exercises: No matching exercises found matching the criteria, this exercise will be omitted:`, exerciseCriteria);
                        rawExerciseDetails.push(null);
                    }
                }

                // Filter out the null exerciseDetails (it happens when a requested exercise cannot be found)
                const filteredExerciseDetails = rawExerciseDetails.filter(detail => detail !== null);      
                
                // Logic 11: Shuffle the exercises within a day for variety
                Algorithm.shuffleArray(filteredExerciseDetails);

                // Logic 12: Separate exercises into non-cardio and cardio, cardio exercise will always be added to the end of the array, doesn't affect by intensity
                const cardioExercises = filteredExerciseDetails.filter(ex => ex.muscleGroups.includes(12));
                const nonCardioExercises = filteredExerciseDetails.filter(ex => !ex.muscleGroups.includes(12));

                // Merge two arrays into one
                const exerciseDetails = [...nonCardioExercises.slice(0, maxExercisesPerDay), ...cardioExercises];

                if (exerciseDetails.length > 0) {
                    dailyRoutines.push({ dayNumber: i + 1, exerciseDetails });
                }
            }
            if (bodyFatDecreased !== undefined && !bodyFatDecreased) Polling.addLog(`Need to put more work on fat loss, adding/modifying cardio exercise...\n`);
            if (bodyMassIncreased !== undefined && !bodyMassIncreased) Polling.addLog(`Need to put more work on building muscle, adding reps to exercises...\n`);

            // Logic 13: if both bodyFatDecreased is true and bodyMassIncrease is false, take a break (overtrained), send warning to the frontend
            if ((bodyFatDecreased !== undefined && bodyFatDecreased) && (bodyMassIncreased !== undefined && !bodyMassIncreased)) {
                Polling.addLog(`Warning: Both of your body fat and body mass are declining the past weeks, you might have overtrained, we suggest you to take a break for a week.\n`);
            }
            Polling.addLog("Putting the recommended exercises together...\n");
            Polling.addLog("Recommendations completed.");

            console.log("Recommendations completed.");
            return res.json({ dailyRoutines });

        } catch (err) {
            console.error("Error Recommending exercises:", err);
            res.status(400).json({ error: err.message });
        }
    }; 

    /**
     * Method to shuffle base plan array orders.
     * @param {*} array 
     * @returns array
     */
    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    /**
     * Method to calculate the Body Fat and Body Mass changes for the past 4 weeks (or minimum 2 weeks).
     * @param {*} latestProgress 
     * @param {*} bodyFatClassification 
     * @param {*} ffmiClassification 
     * @returns 
     */
    static async calculateBodyFatAndBodyMassChanges(latestProgress, bodyFatClassification, ffmiClassification) {

        // Map all bodyMeasurementIds into a flat list
        const bodyMeasurementIds = latestProgress.map(progress => progress.bodyMeasurementId);

        // Fetch each measurement
        const lastFourMeasurements = await prisma.bodyMeasurement.findMany({
            where: {
                id: {
                    in: bodyMeasurementIds
                }
            }
        });        

        // Only if the length is more than 2 and the user is in certain classifications, then it will perform calculation and return booleans
        // Otherwise, it returns undefined.
        let bodyFatDecreased;
        if (lastFourMeasurements.length > 2 && (["Average", "Below Average", "Poor"].includes(bodyFatClassification))) {
            const bodyFatPercentSum = lastFourMeasurements.reduce((sum, measurement) => sum + measurement.bodyFatPercent, 0);
            const bodyFatAverage = bodyFatPercentSum / lastFourMeasurements.length;
            bodyFatDecreased = (bodyFatAverage - lastFourMeasurements[0].bodyFatPercent) < 0;
        }

        let bodyMassIncreased;
        if (lastFourMeasurements.length > 2 && (["Skinny", "Average", "Intermediate Built"].includes(ffmiClassification))) {
            const bodyMassSum = lastFourMeasurements.reduce((sum, measurement) => sum + measurement.muscleMass, 0);
            const bodyMassAverage = bodyMassSum / lastFourMeasurements.length;
            bodyMassIncreased = (bodyMassAverage - lastFourMeasurements[0].muscleMass) > 0;
        }

        return { bodyFatDecreased, bodyMassIncreased };
    }

    // Current Base plans (total in 8): 
    // Male, 1 Fat Loss and 3 Build Muscle plans.
    // Female, 1 Fat Loss and 3 Build Muscle plans.
    static basePlans = [
        {
            title: "Fat Loss",
            levelId: 1, // Beginner level
            gender: "M", // Male
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation
                        { muscleGroups: [3], typeId: 1 },    // Abs, Compound
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [1], typeId: 1 },    // Biceps, Compound                        
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation 
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation                       
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 5,
                    exercises: [
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                }
            ]
        },
        {
            title: "Build Muscle",
            levelId: 1, // Beginner level
            gender: "M", // Male
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [9], typeId: 2 },    // Chest, Isolation
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 1 },    // Triceps, Compound
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation 
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation
                        { muscleGroups: [3], typeId: 1 },    // Abs, Compound
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 1 },    // Triceps, Compound
                    ]
                }
            ]
        },
        {
            title: "Build Muscle",
            levelId: 2, // Intermediate level
            gender: "M", // Male
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 2 },    // Chest, Isolation
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                    ]
                }
            ]
        },
        {
            title: "Build Muscle",
            levelId: 3,  // Advanced level
            gender: "M", // Male
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 2 },    // Chest, Isolation
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [6], typeId: 1 },    // Triceps, Compound
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [5], typeId: 2 },    // Traps, Isolation
                        { muscleGroups: [5], typeId: 1 },    // Traps, Compound
                        { muscleGroups: [14], typeId: 2 },   // Forearm, Isolation
                        { muscleGroups: [14], typeId: 2 },   // Forearm, Isolation
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                    ]
                },
            ]
        },
        {
            title: "Fat Loss",
            levelId: 1, // Beginner level
            gender: "F", // Female
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [4], typeId: 1},     // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 2 },    // Chest, Isolation
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
                {
                    day: 5,
                    exercises: [
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [11], typeId: 1 },   // Glutes, Compound
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                        { muscleGroups: [1], typeId: 1 },    // Biceps, Compound
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [12], typeId: 1 },   // Cardio
                    ]
                },
            ]
        },
        {
            title: "Build Muscle",
            levelId: 1, // Beginner level
            gender: "F", // Female
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                    ]
                },
                {
                    day: 5,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                    ]
                },
            ]
        },
        {
            title: "Build Muscle",
            levelId: 2, // Intermediate level
            gender: "F", // Female
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [11], typeId: 2 },   // Glutes, Isolation
                    ]
                },
            ]
        },
        {
            title: "Build Muscle",
            levelId: 3, // Advanced level
            gender: "F", // Female
            days: [
                {
                    day: 1,
                    exercises: [
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [9], typeId: 1 },    // Chest, Compound
                        { muscleGroups: [6], typeId: 1 },    // Triceps, Compound
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                    ]
                },
                {
                    day: 2,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [13], typeId: 2 },   // Hamstrings, Isolation
                        { muscleGroups: [4], typeId: 2 },    // Quads, Isolation
                    ]
                },
                {
                    day: 3,
                    exercises: [
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [8], typeId: 1 },    // Lats, Compound
                        { muscleGroups: [10], typeId: 1 },   // Upper back, Compound
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [5], typeId: 2 },    // Traps, Isolation
                    ]
                },
                {
                    day: 4,
                    exercises: [
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [4], typeId: 1 },    // Quads, Compound
                        { muscleGroups: [7], typeId: 2 },    // Calves, Isolation
                        { muscleGroups: [3], typeId: 2 },    // Abs, Isolation
                    ]
                },
                {
                    day: 5,
                    exercises: [
                        { muscleGroups: [2], typeId: 1 },    // Shoulders, Compound
                        { muscleGroups: [13], typeId: 1 },   // Hamstrings, Compound
                        { muscleGroups: [2], typeId: 2 },    // Shoulders, Isolation
                        { muscleGroups: [1], typeId: 2 },    // Biceps, Isolation
                        { muscleGroups: [6], typeId: 2 },    // Triceps, Isolation
                    ]
                },
            ]
        },
    ];  
}

module.exports = Algorithm;