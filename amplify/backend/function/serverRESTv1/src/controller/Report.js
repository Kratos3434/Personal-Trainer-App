const prisma = require('../prismaInstance');
const FitnessUtils = require("./FitnessUtils");
const { assessProgress } = require("./WeeklyProgress");

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

            let prevBodyMeasurementId
            if (index == 0) { // Using initBodyMeasurment when this is the first progress
                prevBodyMeasurementId = profile.bodyMeasurementId
            } else {
                prevBodyMeasurementId = allWeeklyProgress[index - 1].bodyMeasurementId
            }

            console.log("------Pass-------")
            const progress = await assessProgress(currentWeeklyProgress.bodyMeasurementId, prevBodyMeasurementId)

            /** Could be made into a function (Temporary Logic) **/
            let fatDiff = progress.gainedFat
            let muscleDiff = progress.gainedMuscle
            const progressSummary = progress.assess
            
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
            
            const fatResult = FitnessUtils.getClassificationResult(
                currentBodyMeasurement.bodyFatPercent,
                FitnessUtils.getAgeFromDob(profile.dob),
                profile.gender
            )

            const result = {
                gainedFat : fatDiff,
                gainedMuscle : muscleDiff,
                assess: progressSummary,
                fat: currentBodyMeasurement.bodyFatPercent,
                muscle: currentBodyMeasurement.muscleMass,
                weight: currentBodyMeasurement.weight,
                height: profile.height,
                chest : currentBodyMeasurement.chest,
                abdomen : currentBodyMeasurement.abdomen,
                thigh : currentBodyMeasurement.thigh,
                startDate: currentWeeklyRoutine.startDate,
                endDate : currentWeeklyRoutine.endDate,
                fatClassification: fatResult,
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
                    report = await prisma.report.create({
                        data: {
                            startDate: result.startDate,  
                            endDate: result.endDate,      
                            progressSummary: progressSummary, 
                            weeklyProgressId: progressId    
                        }
                    });
                    console.log(report);
                } catch (error) {
                    console.error("Error creating report:", error);
                }
            }

            result.reportDate = report.created

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