const prisma = require("../prismaInstance");
const FitnessUtils = require("./FitnessUtils");
//const { assessProgress } = require("./WeeklyProgress");
const Authorization = require("./Authorization");

class Report {
  static async getReport(req, res) {
    try {
      const { id } = req.params;
      const progressId = Number(id);
      const prevId = req.query.prevId;
      console.log(req.headers);

      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      // Get the current user's profileId
      const profile = await prisma.profile.findUnique({
        where: {
          userId: userId,
        },
      });

      console.log("-------profile-------");
      console.log(profile);

      const allWeeklyProgress = await prisma.weeklyProgress.findMany({
        where: {
          profileId: profile.id,
        },
        include: {
          bodyMeasurement: true,
        },
        orderBy: {
          date: "asc",
        },
      });

      console.log(allWeeklyProgress);

      const index = allWeeklyProgress.findIndex((progress) => progress.id == progressId);

      const currentWeeklyProgress = allWeeklyProgress[index];
      const prevWeeklyProgress = allWeeklyProgress.find((progress) => progress.id == prevId);

      const allPrevProgress = allWeeklyProgress.slice(0, index); // to send for dropdown box
      let prevProgress = [];
      allPrevProgress.forEach((p) => {
        const item = { id: p.id, date: p.date };
        prevProgress.push(item);
      });

      console.log("----WeeklyProgress---");
      console.log(currentWeeklyProgress);
      console.log(prevWeeklyProgress);

      const currentBodyMeasurement = currentWeeklyProgress.bodyMeasurement;

      console.log("----currentBodyMEasurement----");
      console.log(currentBodyMeasurement);

      let prevBodyMeasurement;
      if (index == 0) {
        // Using initBodyMeasurment when this is the first progress
        prevBodyMeasurement = await prisma.bodyMeasurement.findUnique({
          where: {
            id: profile.bodyMeasurementId,
          },
        });
      } else if (!prevWeeklyProgress) {
        prevBodyMeasurement = allWeeklyProgress[index - 1].bodyMeasurement;
      } else {
        prevBodyMeasurement = prevWeeklyProgress.bodyMeasurement;
      }

      console.log("------Pass-------");

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

      console.log("-----progress assess");
      console.log(assess);
      /** *** *** *** *** ** ** ** **** **** **/

      const ffmiResult = FitnessUtils.getFFMIClassification(
        FitnessUtils.getFFMI(
          profile.height,
          currentBodyMeasurement.weight,
          currentBodyMeasurement.bodyFatPercent,
        ),
        profile.gender,
      );

      const fatResult = FitnessUtils.getClassificationResult(
        currentBodyMeasurement.bodyFatPercent,
        FitnessUtils.getAgeFromDob(profile.dob),
        profile.gender,
      );

      const prevFfmiResult = FitnessUtils.getFFMIClassification(
        FitnessUtils.getFFMI(
          profile.height,
          prevBodyMeasurement.weight,
          prevBodyMeasurement.bodyFatPercent,
        ),
        profile.gender,
      );

      const prevFatResult = FitnessUtils.getClassificationResult(
        prevBodyMeasurement.bodyFatPercent,
        FitnessUtils.getAgeFromDob(profile.dob),
        profile.gender,
      );

      const ffmiTable = FitnessUtils.getClassificationRanges(
        FitnessUtils.getAgeFromDob(profile.dob), //age
        profile.gender,
      );

      const currentWeeklyRoutine = await prisma.weeklyRoutine.findUnique({
        where: {
          id: currentWeeklyProgress.weeklyRoutineId,
        },
      });

      console.log("----currentWeeklyRoutine----");
      console.log(currentWeeklyRoutine);

      const result = {
        gainedFat: fatDiff,
        gainedMuscle: muscleDiff,
        assess: assess,
        fat: currentBodyMeasurement.bodyFatPercent,
        muscle: currentBodyMeasurement.muscleMass,
        weight: currentBodyMeasurement.weight,
        height: profile.height,
        chest: currentBodyMeasurement.chest,
        abdomen: currentBodyMeasurement.abdomen,
        thigh: currentBodyMeasurement.thigh,
        startDate: currentWeeklyRoutine.startDate,
        endDate: currentWeeklyRoutine.endDate,
        fatClassification: fatResult,
        ffmiClassification: ffmiResult,
        prevFat: prevBodyMeasurement.bodyFatPercent,
        prevMuscle: prevBodyMeasurement.muscleMass,
        prevWeight: prevBodyMeasurement.weight,
        prevChest: prevBodyMeasurement.chest,
        prevAbdomen: prevBodyMeasurement.abdomen,
        prevThigh: prevBodyMeasurement.thigh,
        prevFatClassification: prevFatResult,
        prevFfmiClassification: prevFfmiResult,
        ranges: ffmiTable,
        reportDate: currentWeeklyProgress.date,
        lastReportDate: prevWeeklyProgress? prevWeeklyProgress.date : prevBodyMeasurement.date,
        progress: prevProgress,
      };

      let report = await prisma.report.findUnique({
        where: {
          weeklyProgressId: progressId,
        },
      });

      if (!report) {
        // Create Report
        try {
          console.log("create called");
          report = await prisma.report.create({
            data: {
              startDate: result.startDate,
              endDate: result.endDate,
              progressSummary: assess,
              weeklyProgressId: progressId,
            },
          });
          console.log(report);
        } catch (error) {
          console.error("Error creating report:", error);
        }
      }

      res.status(200).json(result);
    } catch (err) {
      console.log(err);
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = Report;
