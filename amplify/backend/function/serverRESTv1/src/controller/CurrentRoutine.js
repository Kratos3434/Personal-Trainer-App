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

            // Fetch the weekly routine for the current week, related daily routines, exercise details and exercises
            const weeklyRoutine = await prisma.weeklyRoutine.findFirst({
                where: {
                    profileId: profile.id,
                },
                include: {
                    dailyRoutines: {
                        include: {
                            exerciseDetails: {
                                include: {
                                    exercise: true
                                }
                            }
                        }
                    }
                }
            });

            return res.status(200).json({ status: true, data: weeklyRoutine, message: "Routine retrieved successfully" });
        } catch (err) {
            res.status(400).json({ status: false, error: err });
        }
    }
}

module.exports = CurrentRoutine;