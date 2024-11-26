const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");


/**
 * Helper function to assess progress by comparing two body measurements
 * @param {BodyMeasurement} currentBodyMeasurement 
 * @param {BodyMeasurement} prevBodyMeasurement 
 */
async function assessProgress(currentMeasurementId, prevMeasurementId) {
    if (!currentMeasurementId || !prevMeasurementId) throw "IDs for both body measurements are required"

    // Retrieve the body measurements for comparison
    prevBodyMeasurement = await prisma.bodyMeasurement.findUnique({
        where: {
            id: prevMeasurementId
        }
    });

    if (!prevBodyMeasurement) throw "Can't find previous body measurements!";

    currentBodyMeasurement = await prisma.bodyMeasurement.findUnique({
        where: {
            id: currentMeasurementId
        }
    });

    if (!currentBodyMeasurement) throw "Can't find current body measurements!";

    // Calculate the differences
    let fatDiff = currentBodyMeasurement.bodyFatPercent - prevBodyMeasurement.bodyFatPercent;
    let muscleDiff = currentBodyMeasurement.muscleMass - prevBodyMeasurement.muscleMass;

    // Assess the progress
    let assess = "";

    if (fatDiff < 0 && muscleDiff > 0) {
        assess = "Great!";
    } else if ((fatDiff < 0 && muscleDiff < 0) || (fatDiff > 0 && muscleDiff > 0)) {
        assess = "Good Job!";  
    } else {
        assess = "Push Harder!";
    }

    return {
        gainedFat: fatDiff,
        gainedMuscle: muscleDiff,
        assess,
        currentMeasurementId, 
        prevMeasurementId,
    };
};


class WeeklyProgress {
    /**
     * Save weekly progress to the db
     * @param {Request} req 
     * @param {Response} res 
     */
    static async saveWeeklyProgress(req, res) {
        try {
            let { weeklyRoutineId, measurementId } = req.body;

            if (!weeklyRoutineId) throw "Weekly id is required";
            if (!measurementId) throw "Body measurement id is required"

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

            // Check if weekly routine exists
            const weeklyRoutine = await prisma.weeklyRoutine.findUnique({
                where: { id: +weeklyRoutineId }
            });

            if (!weeklyRoutine) throw "Weekly Routine does not exist";

            // Check if body measurement exists
            const bodyMeasurement = await prisma.bodyMeasurement.findUnique({
                where: { id: +measurementId }
            });

            if (!bodyMeasurement) throw "Body Measurement does not exist";

            
            // Save weekly progress data to db
            const result = await prisma.weeklyProgress.create({
                data: {
                    profileId: profile.id,
                    weeklyRoutineId: weeklyRoutine.id,
                    bodyMeasurementId: bodyMeasurement.id
                }
            });
            
            res.status(200).json({ status: true, data: result, message: "Weekly Progress saved successfully" });

        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    };


    /**
     * Retrieve a single progress entry by ID
     * @param {Request} req 
     * @param {Response} res 
     */
    static async getProgressById(req, res) {
        try {
            const progressId = req.params.progressId;

            if (!progressId) throw "Progress ID is required!";

            const progress = await prisma.weeklyProgress.findUnique({
                where: {
                    id: +progressId
                }
            });

            if (!progress) {
                return res.status(404).json({ status: false, message: "Progress not found" });
            }

            res.status(200).json({ status: true, data: progress, message: "Progress entry retrieved successfully!" });
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    };


    /**
     * Retrieve all associated progress entries for a user
     * @param {Request} req 
     * @param {Response} res 
     */
    static async getProgressByProfile(req, res) {
        try {
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

            const progress = await prisma.weeklyProgress.findMany({
                where: {
                    profileId: profile.id
                },
                include: {
                    bodyMeasurement: true
                },
                orderBy: {
                    date: 'asc'
                }
            });

            if (progress.length === 0) {
                return res.status(404).json({ status: false, message: "No associated progress entries" });
            }

            res.status(200).json({ status: true, data: progress, message: "Progress entries retrieved successfully!" });
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    };


    /**
     * Retrieve current week's progress summary information
     * @param {Request} req 
     * @param {Response} res 
     */
    static async getProgressResults(req, res) {
        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);
            const userId = decoded.id;

            // Get the current user's profileId
            const profile = await prisma.profile.findUnique({
                where: {
                    userId: userId
                },
                select: {
                    id: true,
                    bodyMeasurementId: true
                }
            });

            if (!profile) throw "Profile does not exist";

            // Retrieve two latest body measurements
            const latestWeeklyProgress = await prisma.weeklyProgress.findMany({
                where: {
                    profileId: profile.id
                },
                orderBy: { 
                    id: 'desc' 
                },
                take: 2
            });

            if (latestWeeklyProgress.length === 0) {
                return res.status(404).json({ message: "Progress not found!" });
            } 
            
            // Get body measurement IDs
            const currentMeasurementId = latestWeeklyProgress[0].bodyMeasurementId;
            let prevMeasurementId = null;

            if (latestWeeklyProgress.length === 1) {
                // Use the initial measurement for comparison if only one progress record exists
                prevMeasurementId = profile.bodyMeasurementId;
            } else {
                prevMeasurementId = latestWeeklyProgress[1].bodyMeasurementId;
            }

            const result =  await assessProgress(currentMeasurementId, prevMeasurementId);

            res.status(200).json({ status: true, data: result, message: "Progress results retrieved successfully!" });
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    };
}


module.exports = { WeeklyProgress, assessProgress };