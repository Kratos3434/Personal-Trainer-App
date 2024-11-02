const prisma = require('../prismaInstance');
const FitnessUtils = require("./FitnessUtils");

class Report {

    static async getReport (req, res) {
        try { 
            const { id } = req.params
            const progressId = Number(id);

            const allWeeklyProgress = await prisma.weeklyProgress.findMany({
                orderBy: {
                  date: 'asc' // Change to 'desc' for descending order (newest first)
                }
              });

            console.log(allWeeklyProgress);

            const index = allWeeklyProgress.findIndex(progress => progress.id == progressId);

            const currentWeeklyProgress = allWeeklyProgress[index]

            console.log("----currentWeeklyProgress---")
            console.log(currentWeeklyProgress);
           
            const currentBodyMeasurement = await prisma.bodyMeasurement.findUnique({
                where: {
                    id:  currentWeeklyProgress.bodyMeasurementId
                }
            })

            console.log("----currentBodyMEasurement----")
            console.log(currentBodyMeasurement);

            const profileId = allWeeklyProgress[index].profileId
            const profile = await prisma.profile.findUnique({
                    where: {
                        id: profileId
                    }
                })

            console.log("----profile----")
            console.log(profile);
            let prevBodyMeasurement = {}

            if (index == 0) { // Using initBodyMeasurment when this is the first progress
                prevBodyMeasurement = await prisma.bodyMeasurement.findUnique({
                    where: {
                        id: profile.bodyMeasurementId
                    }
                })

            } else {
                const prevBodyMeasurmentId = allWeeklyProgress[index - 1].bodyMeasurementId
                prevBodyMeasurement = await prisma.bodyMeasurement.findUnique({
                    where: {
                        id: prevBodyMeasurmentId
                    }
                })
            }

            console.log("----prevBodyMEasurement----")
            console.log(prevBodyMeasurement);

            /** Could be made into a function (Temporary Logic) **/
            let fatDiff = currentBodyMeasurement.bodyFatPercent - prevBodyMeasurement.bodyFatPercent
            let muscleDiff = currentBodyMeasurement.muscleMass - prevBodyMeasurement.muscleMass
            let firstString = "";
            let secondString = "";
            let thirdString = "";

            if (fatDiff < 0 && muscleDiff > 0) {
                firstString = "Great!"
                secondString = "gained" // fat
                thirdString =  "gained"  // muscle 
            } else if (fatDiff < 0 && muscleDiff < 0) {
                firstString = "Good Job!"
                secondString = "lost" // fat
                thirdString = "lost"  // muscle  
            } else if (fatDiff > 0 && muscleDiff > 0) {
                firstString = "Good Job!"
                secondString = "gained"   // fat
                thirdString = "gained"    // muscle 
            } else {
                firstString = "Push Harder!"
                secondString = "lost"  // fat
                thirdString = "gained" // muscle 
            }

            const progressSummary = `${firstString} You've ${secondString} ${Math.abs(muscleDiff)}kg of lean muscle and ${thirdString} ${Math.abs(fatDiff)}% of Body Fat compared to last week`

            console.log("-----progressSummary")
            console.log(progressSummary);
            /** *** *** *** *** ** ** ** **** **** **/

            const currentWeeklyRoutine = await prisma.weeklyRoutine.findUnique({
                where : {
                    id : currentWeeklyProgress.weeklyRoutineId
                }
            })
            

            console.log("----currentWeeklyRoutine----")
            console.log(currentWeeklyRoutine);

            const ffmiResult = FitnessUtils.getFFMIClassification(
                FitnessUtils.getFFMI(profile.height, currentBodyMeasurement.weight, currentBodyMeasurement.bodyFatPercent),
                profile.gender
            )

            const ffmiTable = FitnessUtils.getClassificationRanges(
                FitnessUtils.getAgeFromDob(profile.dob), //age
                profile.gender
            )

            const result = {
                gainedFat : fatDiff,
                gainedMuscle : muscleDiff,
                assess: firstString,
                fat: currentBodyMeasurement.bodyFatPercent,
                muscle: currentBodyMeasurement.muscleMass,
                weight: currentBodyMeasurement.weight,
                height: profile.height,
                chest : currentBodyMeasurement.chest,
                abdomen : currentBodyMeasurement.abdomen,
                thigh : currentBodyMeasurement.thigh,
                startDate: currentWeeklyRoutine.startDate,
                endDate : currentWeeklyRoutine.endDate,
                ffmiClassification : ffmiResult,
                ranges : ffmiTable
            }

            const report = await prisma.report.findUnique({
                where: {
                    weeklyProgressId: progressId
                }
            })
    
            if (!report) { // Create Report
                try {
                    console.log('create called');
                    const createdReport = await prisma.report.create({
                        data: {
                            startDate: result.startDate,  
                            endDate: result.endDate,      
                            progressSummary: progressSummary, 
                            weeklyProgressId: progressId    
                        }
                    });
                    console.log('error?');
                    console.log(createdReport);
                } catch (error) {
                    console.error("Error creating report:", error);
                }
            }

            console.log("-----result-----");
            console.log(result);

            res.status(200).json(result);
        }
        catch (err) {
            console.log(err);
            res.status(400).json({status: false, error: err});
        }
    }
}

module.exports = Report;