require('dotenv').config({path: '../.env'}); 
const fetch = require('node-fetch');

let production = true;
const endpoint = production ? `https://7u45qve0xl.execute-api.ca-central-1.amazonaws.com/dev`: `http://10.10.6.150:8080`; // Must use aws endpoint to fetch videos
const adminToken = process.env.ADMIN_PASS;

// Data Entry
// name, typeId, intensity, defaultSets, defaultReps(optional), minutes(optional), levelId, requiredEquipmentId, muscleGroupIds[], workoutEnvironmentIds[]
const exercisesArray = [
    //["Seated Cable Row", 1, 1, 3, 12, null, 1, 3, [10], [1]],
    //["One Arm Dumbbell Row", 1, 1, 3, 12, null, 1, 1, [10], [1,2]],
    ["Bent Over Dumbbell Row", 1, 1, 3, 12, null, 1, 1, [10], [1,2]],
    ["Tripod Dumbbell Row", 1, 1, 3, 12, null, 1, 1, [10], [1,2]],
];

// Consolidated workflow
async function createExerciseAndJunctions() {
    try {
        for (const exerciseData of exercisesArray) {
            const [name, typeId, intensity, defaultSets, defaultReps, minutes, levelId, requiredEquipmentId, muscleGroupIds, workoutEnvironmentIds] = exerciseData;

            // Create an exercise object
            const exerciseObj = {
                name: name,
                typeId: typeId,
                intensity: intensity,
                defaultSets: defaultSets,
                defaultReps: defaultReps,
                minutes: minutes,
                levelId: levelId,
                requiredEquipmentId: requiredEquipmentId
            };

            // Create the exercise
            const exerciseId = await createExercise(exerciseObj);
            if (!exerciseId) {
                throw new Error("Failed to retrieve exerciseId.");
            }

            // Create muscle group junctions
            await createMuscleGroupJunctions(exerciseId, muscleGroupIds);

            // Create workout environment junctions
            await createEnvironmentJunctions(exerciseId, workoutEnvironmentIds);
        }
    } catch (err) {
        console.error('Error in creating exercises and junctions workflow:', err.message);
    }
};

// Method to create exercise
async function createExercise(exerciseData) {
    try {
        const response = await fetch(`${endpoint}/exercise/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminToken
            },
            body: JSON.stringify(exerciseData)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Error creating exercise: ${result.error}`);
        }

        console.log(`Exercise created successfully with ID: ${result.data.id}`);
        return result.data.id;
    } catch (err) {
        console.error('Error in creating exercise:', err.message);
        throw err;
    }
};

// Method to create muscle group junctions
async function createMuscleGroupJunctions(exerciseId, muscleGroupIds) {
    try {
        await Promise.all(muscleGroupIds.map(async (muscleGroupId) => {
            const junctionData = {
                exerciseId: exerciseId,
                muscleGroupId: muscleGroupId
            };

            const response = await fetch(`${endpoint}/muscleGroupJunction/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify(junctionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(`Error creating muscle group junction: ${result.error}`);
            }

            console.log(`Junction created for exercise ID: ${exerciseId} and muscle group ID: ${muscleGroupId}`);
        }));
    } catch (err) {
        console.error('Error in creating muscle group junctions:', err.message);
        throw err; 
    }
};

// Method to create muscle group junctions
async function createEnvironmentJunctions(exerciseId, workoutEnvironmentIds) {
    try {
        await Promise.all(workoutEnvironmentIds.map(async (workoutEnvironmentId) => {
            const junctionData = {
                exerciseId: exerciseId,
                workoutEnvironmentId: workoutEnvironmentId
            };

            const response = await fetch(`${endpoint}/workoutEnvironmentJunction/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify(junctionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(`Error creating workout environment junction: ${result.error}`);
            }

            console.log(`Junction created for exercise ID: ${exerciseId} and workout environment ID: ${workoutEnvironmentId}`);
        }));
    } catch (err) {
        console.error('Error in creating workout environment junctions:', err.message);
        throw err; 
    }
};

createExerciseAndJunctions()
        .then(() => console.log('Exercise setup completed successfully.'))
        .catch(err => console.error('Error during exercise setup:', err.message));

module.exports = createExerciseAndJunctions;
