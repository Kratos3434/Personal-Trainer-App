const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");

class CurrentRoutine {
    /**
     * Method to fetch the Current Weekly Routine from the db.
     * @param {Request} req 
     * @param {Response} res 
     * @returns weekly routine
     */
    static async getCurrentWeeklyRoutine (req, res){
        try{
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

            // Fetch the weekly routine for the current week, related daily routines, exercise details, exercises and their targeted muscle groups
            const weeklyRoutine = await prisma.weeklyRoutine.findFirst({
                where: {
                    profileId: profile.id,
                },
                orderBy: {
                    startDate: "desc",
                },
                include: {
                    dailyRoutines: {
                        include: {
                            exerciseDetails: {
                                orderBy: {
                                    id: "asc", // Order exercise details by their ID
                                },
                                include: {
                                    exercise: {
                                        include: {
                                            muscleGroups: { include: { muscleGroup: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

         // Check if weeklyRoutine is found
         if (!weeklyRoutine) {
            return res.status(404).json({ status: false, error: "Weekly routine not found" });
        }

        // Format the weekly routine object to include the information about the targeted muscle groups
        // excluding muscle junction info
        weeklyRoutine.dailyRoutines.forEach(routine => {
            routine.exerciseDetails.forEach(detail => {
                detail.exercise.muscleGroups = detail.exercise.muscleGroups.map(mg => ({
                    id: mg.id,
                    description: mg.muscleGroup.description
                }));
            });
        });

        return res.status(200).json({ status: true, data: weeklyRoutine, message: "Routine retrieved successfully" });

        } catch (err) {
            return res.status(500).json({ status: false, error: err });
        }
    }
}

module.exports = CurrentRoutine;