const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");

class BodyMeasurement {
  /**
   * Saves body measurement data for a user.
   * @param {Request} req
   * @param {Response} res
   */
  static async saveBodyMeasurement(req, res) {
    const {
      weight,
      chest,
      abdomen,
      thigh,
      bypassMeasurementFlag,
      bodyFatPercent,
      muscleMass,
    } = req.body;

    try {
      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      // Ensure that at least one measurement is provided
      if (!chest && !abdomen && !thigh && !bypassMeasurementFlag) {
        throw "At least one measurement or the bypass option must be provided.";
      }

      // Create or update body measurement for the user
      const bodyMeasurement = await prisma.bodyMeasurement.upsert({
        where: {
          profileId: userId, // Assuming a relationship with profile
        },
        update: {
          weight,
          chest,
          abdomen,
          thigh,
          bypassMeasurementFlag,
          bodyFatPercent,
          muscleMass,
          date: new Date(), // Update the date to now
        },
        create: {
          weight,
          chest,
          abdomen,
          thigh,
          bypassMeasurementFlag,
          bodyFatPercent,
          muscleMass,
          profile: {
            connect: {
              userId: userId, // Link to profile
            },
          },
        },
      });

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
