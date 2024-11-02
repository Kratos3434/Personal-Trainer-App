require('dotenv').config({path: '../.env'}); 
const fetch = require('node-fetch');
const Video = require('./Video');

let production = true;
const endpoint = production ? `https://7u45qve0xl.execute-api.ca-central-1.amazonaws.com/dev`: `http://10.10.6.150:8080`; // Must use aws endpoint to fetch videos
const adminToken = process.env.ADMIN_PASS;

// Data Entry
// name, typeId, intensity, defaultSets, defaultReps(optional), minutes(optional), levelId, requiredEquipmentId, muscleGroupIds[], workoutEnvironmentIds[]
const exercisesArray = [
    //["Walking Barbell Lunge", 1, 3, 3, 12, null, 3, 4, [4], [1,2]],
    ["Kettlebell Walking Lunge", 1, 3, 3, 12, null, 3, 11, [4], [1,2]],
    ["Deep Squat", 1, 3, 3, 10, null, 2, 4, [4], [1,2]],
    // ["Dumbbell Wrist Curl Forearm", 2, 1, 3, 12, null, 1, 1, [14], [1,2]],
    // ["Reverse Grip Barbell Curl Forearm", 2, 1, 3, 12, null, 1, 4, [14], [1,2]],
    //["Dumbbell High Low Carry Forearm", 1, 1, 3, 12, null, 2, 1, [14], [1,2]],
    // ["Dumbbell Overhead Carry Forearm", 1, 1, 3, 12, null, 2, 1, [14], [1,2]],
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
        for (const muscleGroupId of muscleGroupIds) {
            for (let attempt = 1; attempt <= 3; attempt++) { // Retry loop
                try {
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
                        throw new Error(`Attempt ${attempt}: ${result.error}`);
                    }

                    console.log(`Junction created for exercise ID: ${exerciseId} and muscle group ID: ${muscleGroupId}`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay
                    break; // Exit loop on success

                } catch (err) {
                    if (attempt === 3) {
                        console.error(`Failed after 3 attempts for muscle group ID ${muscleGroupId}:`, err.message);
                        throw err;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay before retrying
                }
            }
        }
    } catch (err) {
        console.error('Error in creating muscle group junctions:', err.message);
        throw err; 
    }
};


// Method to create muscle group junctions
async function createEnvironmentJunctions(exerciseId, workoutEnvironmentIds) {
    try {
        for (const workoutEnvironmentId of workoutEnvironmentIds) {
            for (let attempt = 1; attempt <= 3; attempt++) { // Retry loop because of potential throttling that caused import failures
                try {
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
                        throw new Error(`Attempt ${attempt}: ${result.error}`);
                    }

                    console.log(`Junction created for exercise ID: ${exerciseId} and workout environment ID: ${workoutEnvironmentId}`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay
                    break; // Exit loop on success

                } catch (err) {
                    if (attempt === 3) {
                        console.error(`Failed after 3 attempts for environment ID ${workoutEnvironmentId}:`, err.message);
                        throw err;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay before retrying
                }
            }
        }
    } catch (err) {
        console.error('Error in creating workout environment junctions:', err.message);
        throw err; 
    }
};

async function fetchIndividualVideo(name, id) {
    try {
        //Generate the video data
        const videos = await Video.getVideosFromYoutubeByExerciseName(name);
        console.log(videos);

        //If Youtube reaches its quota, delete the previously created exercises
        if (!videos) throw "Error fetching videos";        

        videos.map(async (e) => {
            //Create many videos
            await prisma.video.create({
                data: {
                    url: `https://www.youtube.com/watch?v=${e.id.videoId}`,
                    title: e.snippet.title,
                    thumbnail: e.snippet.thumbnails.default.url,
                    exerciseId: id
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
}

// fetchIndividualVideo("Side Crunch Abs", 322);

createExerciseAndJunctions()
        .then(() => console.log('Exercise setup completed successfully.'))
        .catch(err => console.error('Error during exercise setup:', err.message));

module.exports = createExerciseAndJunctions;
