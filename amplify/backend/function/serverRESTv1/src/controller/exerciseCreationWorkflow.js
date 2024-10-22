require('dotenv').config({path: '../.env'}); 
const fetch = require('node-fetch');

const endpoint = `https://7u45qve0xl.execute-api.ca-central-1.amazonaws.com/dev`;
const adminToken = process.env.ADMIN_PASS;

// Data Entry
// name, intensity, defaultSets, defaultReps, levelId, requiredEquipmentId, muscleGroupIds[], workoutEnvironmentIds[]
const exercisesArray = [
    ["Squat Jump", 1, 2, 20, 1, 0, [4], [1,2,3]],
    //["Squat", 2, 3, 10, 2, [1], [1]],
];

// Consolidated workflow
async function createExerciseAndJunctions() {
    try {
        for (const exerciseData of exercisesArray) {
            const [name, intensity, defaultSets, defaultReps, levelId, requiredEquipmentId, muscleGroupIds, workoutEnvironmentIds] = exerciseData;

            // Create an exercise object
            const exerciseObj = {
                name: name,
                intensity: intensity,
                defaultSets: defaultSets,
                defaultReps: defaultReps,
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
