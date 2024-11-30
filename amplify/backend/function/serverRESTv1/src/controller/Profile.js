const prisma = require("../prismaInstance");
const Authorization = require("./Authorization");
const { Request, Response } = require("express");
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

class Profile {
  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async saveProfile(req, res) {
    const { dob, gender, height } = req.body;

    try {
      if (!dob) throw "Date of Birth is required";
      if (!gender) throw "Gender is required";
      if (!height) throw "Height is required";

      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      const updatedProfile = await prisma.profile.update({
        where: {
          userId: userId,
        },
        data: {
          dob: new Date(dob),
          gender,
          height,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ status: true, data: updatedProfile, message: "Profile Saved" });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async getByToken(req, res) {
    const { initBodyMeasurement } = req.query;
    try {
      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      const profile = await prisma.profile.findUnique({
        where: {
          userId: +userId,
        },
        include: {
          initBodyMeasurement: initBodyMeasurement === "true" ? true : false,
          userAccount: {
            select: {
              email: true,
                            stripeId: true,
            },
          },
        },
      });

      if (!profile) throw "Profile does not exist";

            let subscriptionStatus = 'unknown';

            if (profile.userAccount.stripeId) {
                const subscriptions = await stripe.subscriptions.list({
                    customer: profile.userAccount.stripeId
                });
                const subscription = subscriptions.data[0];
                if (subscription.cancel_at_period_end) {
                    subscriptionStatus = 'canceled';
                } else {
                    subscriptionStatus = subscription.status;
                }
            }

            res.status(200).json({status: true, data: {...profile, subscriptionStatus}, message: "Profile retrieved"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async update(req, res) {
    const { firstName, lastName, dob, gender, height } = req.body;
    try {
      const decoded = Authorization.decodeToken(req.headers.authorization);

      const id = decoded.id;

      if (!id) throw "Invalid access;";

      if (dob) {
        const date = new Date(dob);
        if (isNaN(date.getTime())) {
          throw "Date of birth is not a valid date";
        }
      }

      if (gender) {
        if (!(gender === "M" || gender === "F")) {
          throw "Gender must be M or F";
        }
      }

      if (height) {
        if (isNaN(height)) {
          throw "height must be in number";
        }
      }

      const profile = await prisma.profile.findUnique({
        where: {
          userId: +id,
        },
      });

      if (!profile) throw "This user does not exist!";

      //Update
      await prisma.profile.update({
        where: {
          id: profile.id,
        },
        data: {
          firstName: firstName ? firstName : profile.firstName,
          lastName: lastName ? lastName : profile.lastName,
          dob: dob ? new Date(dob) : profile.dob,
          gender: gender ? gender : profile.gender,
          height: height ? height : profile.height,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({ status: true, message: "Update successful", data: null });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }

  static async updateIntensityAndLevel(req, res) {
    const { intensityId, levelId } = req.body;

    try {
      if (!intensityId) throw "intensityId is required";
      if (!levelId) throw "levelId is required";

      const decoded = Authorization.decodeToken(req.headers.authorization);
      const userId = decoded.id;

      const updatedProfile = await prisma.profile.update({
        where: {
          userId: userId,
        },
        data: {
          intensityId,
          levelId,
        },
      });

      res.status(200).json({ status: true, data: updatedProfile, message: "Profile Saved" });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = Profile;
