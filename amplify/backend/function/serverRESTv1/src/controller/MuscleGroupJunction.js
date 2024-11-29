const prisma = require("../prismaInstance");
const { Request, Response } = require("express");

class MuscleGroupJunction {
  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async create(req, res) {
    const { exerciseId, muscleGroupId } = req.body;
    try {
      if (exerciseId === undefined) throw "Exercise id is required";
      if (muscleGroupId === undefined) throw "Muscle group id is required";

      const exercise = await prisma.exercise.findUnique({
        where: {
          id: +exerciseId,
        },
      });

      if (!exercise) throw "Exercise does not exist";

      const muscleGroup = await prisma.muscleGroup.findUnique({
        where: {
          id: +muscleGroupId,
        },
      });

      if (!muscleGroup) throw "Muscle group does not exist";

      await prisma.muscleGroupJunction.create({
        data: {
          exerciseId: exercise.id,
          muscleGroupId: muscleGroup.id,
        },
      });

      res.status(200).json({ status: true, message: "success" });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = MuscleGroupJunction;
