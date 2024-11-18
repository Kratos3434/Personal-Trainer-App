require('dotenv').config({path: '../.env'}); 
const fetch = require('node-fetch');
const Video = require('./Video');
const prisma = require('../prismaInstance');

let production = false;
const endpoint = production ? `https://7u45qve0xl.execute-api.ca-central-1.amazonaws.com/dev`: `http://10.10.6.150:8080`;
const adminToken = process.env.ADMIN_PASS;

// Data Entry for exercise creation (Including videos)
// name, typeId, intensity, defaultSets, defaultReps(optional), minutes(optional), levelId, requiredEquipmentId, muscleGroupIds[], workoutEnvironmentIds[]
const exercisesArray = [
    ["Standing Cable Fly Chest", 2, 1, 3, 12, null, 1, 3, [9], [1]],
    ["Kettlebell Walking Lunge", 1, 3, 3, 12, null, 3, 11, [4], [1,2]],
    ["Deep Squat", 1, 3, 3, 10, null, 2, 4, [4], [1,2]],
    ["Dumbbell Wrist Curl Forearm", 2, 1, 3, 12, null, 1, 1, [14], [1,2]],
    ["Reverse Grip Barbell Curl Forearm", 2, 1, 3, 12, null, 1, 4, [14], [1,2]],
    ["Dumbbell High Low Carry Forearm", 1, 1, 3, 12, null, 2, 1, [14], [1,2]],
    ["Dumbbell Overhead Carry Forearm", 1, 1, 3, 12, null, 2, 1, [14], [1,2]],
];

// Data Entry for videos (A separated workflow ONLY for refetching new videos for existing exercises)
// exerciseName, exerciseId
const exercisesArrayForVideo = [
    ["Dumbbell High Low Carry", 321],
    ["Side Crunch", 322],
    ["Walking Barbell Lunge", 323],
    ["Kettlebell Walking Lunge", 328],
    ["Standing Cable Fly", 330],
    ["Cable Shrug", 312],
    ["Snatch Grip High Pull", 313],
    ["Barbell Wrist Curl", 314],
    ["Reverse Grip Cable Curl", 315],
    ["Dumbbell Wrist Curl", 317],
    ["Reverse Grip Barbell Curl", 318],
]

// Consolidated workflow for exercise creation
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

// Video refetch workflow
async function fetchIndividualVideo() {
    try {
        for (const exerciseForVideo of exercisesArrayForVideo) {
            const [name, id] = exerciseForVideo;

            // Check existing exercise
            const exercise = await prisma.exercise.findUnique({
                where: {
                    id: id
                }
            })

            if (!exercise) throw "Exercise does not exist";

            const videos = await Video.getVideosFromYoutubeByExerciseName(name, true);
            console.log(videos);

            for (const e of videos) {
                const videoUrl = `https://www.youtube.com/watch?v=${e.id.videoId}`;

                // Check duplicated vids
                const existingVideo = await prisma.video.findFirst({
                    where: {
                        url: videoUrl,
                        exerciseId: id
                    }
                });

                if (!existingVideo) {
                    // Add the video only if it doesn't already exist
                    await prisma.video.create({
                        data: {
                            url: videoUrl,
                            title: e.snippet.title,
                            thumbnail: e.snippet.thumbnails.default.url,
                            exerciseId: id
                        }
                    });
                }
            }
            console.log("Videos added to the exercise successfully.");
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay
        }
    } catch (err) {
        console.log(err);
    }
}


// ONLY Execute one workflow at a time, comment out another.

// 1. Exercise Creation Workflow
createExerciseAndJunctions()
        .then(() => console.log('Exercise setup completed successfully.'))
        .catch(err => console.error('Error during exercise setup:', err.message));

// 2. Video Refetch Workflow
// fetchIndividualVideo()
//     .then(() => console.log('Videos added to the exercise successfully.'))
//     .catch(err => console.error('Error fetching videos:', err.message));

module.exports = createExerciseAndJunctions;
