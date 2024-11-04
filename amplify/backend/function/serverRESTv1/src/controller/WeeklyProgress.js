const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");

class WeeklyProgress {
    /**
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
}

module.exports = WeeklyProgress;