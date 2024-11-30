const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");
const FitnessUtils = require("./FitnessUtils");

class BodyMeasurement {
  /**
   * Saves body measurement data for a user.
   * @param {Request} req
   * @param {Response} res
   */
  static async saveBodyMeasurement(req, res) {
    let { weight, chest, abdomen, thigh, bypassMeasurementFlag, bodyFatPercent, muscleMass } =
      req.body;

    try {
      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      // Get required data for calculation
      const profile = await prisma.profile.findUnique({
        where: {
          userId: userId,
        },
        select: {
          id: true,
          dob: true,
          gender: true,
          bodyMeasurementId: true,
        },
      });

      if (!profile) throw "Profile does not exist";

      // Required fields on UI are based on bypass flag
      if (bypassMeasurementFlag) {
        if (!weight || !bodyFatPercent || !muscleMass) {
          throw "Weight, bodyFatPercent and muscleMass are required";
        }
      } else {
        if (!weight || !chest || !abdomen || !thigh) {
          throw "weight, chest, abdomen, and thigh are required";
        }

        // Calling methods from Utils to get body fat and muscle mass
        const age = FitnessUtils.getAgeFromDob(profile.dob);
        bodyFatPercent = FitnessUtils.calculateBodyFat(age, profile.gender, chest, abdomen, thigh);
        muscleMass = FitnessUtils.calculateLeanMuscleMass(weight, bodyFatPercent);
      }

      // Save data to db
      const bodyMeasurement = await prisma.bodyMeasurement.create({
        data: {
          weight,
          chest,
          abdomen,
          thigh,
          bypassMeasurementFlag,
          bodyFatPercent,
          muscleMass,
        },
      });

      // If no initial body measurement Id is linked to profile, link the current one to it
      if (!profile.bodyMeasurementId) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { bodyMeasurementId: bodyMeasurement.id },
        });
      }

      res.status(200).json({
        status: true,
        data: bodyMeasurement,
        message: "Body Measurement Saved",
      });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = BodyMeasurement;
